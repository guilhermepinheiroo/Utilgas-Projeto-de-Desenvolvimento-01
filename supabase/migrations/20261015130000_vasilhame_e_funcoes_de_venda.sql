-- ============================================================
-- UtilGás — vasilhames (cheio/vazio) e funções transacionais
-- ============================================================
-- REGRA DE NEGÓCIO
--   Toda venda de botijão (qualquer produto com controla_vazio = true)
--   baixa N botijões CHEIOS e soma N botijões VAZIOS no estoque.
--   O cancelamento da venda desfaz as duas movimentações.
--
-- SIGNIFICADO DAS COLUNAS (tabela produtos)
--   estoque_atual = quantidade de unidades CHEIAS (o que se pode vender)
--   estoque_vazio = quantidade de vasilhames VAZIOS (só se controla_vazio)
--
-- FUNÇÕES (só a API com a service_role consegue chamá-las)
--   registrar_venda(jsonb, uuid)      -> venda + itens + estoque + entrega
--   cancelar_venda(bigint, uuid)      -> desfaz venda, estoque e entrega
--   movimentar_estoque(...)           -> entrada/saída/troca de vazio manual
--
-- CÓDIGOS DE ERRO (SQLSTATE próprio; a API traduz para HTTP)
--   UG404 -> cliente, endereço, produto ou venda não encontrado   -> 404
--   UG409 -> estoque insuficiente / venda já cancelada / entrega
--            já realizada                                         -> 409
--   UG422 -> dado inválido                                        -> 422
--
-- Todas as funções rodam numa transação única: se qualquer passo
-- falhar, nada fica gravado. A baixa de estoque usa um UPDATE com
-- condição (estoque_atual >= quantidade), que o Postgres serializa por
-- linha: duas vendas do último item nunca passam juntas. Os produtos
-- sempre são processados em ordem de id, para evitar deadlock.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Vasilhame vazio
-- ------------------------------------------------------------
alter table public.produtos
  add column controla_vazio boolean not null default false,
  add column estoque_vazio integer not null default 0
    check (estoque_vazio >= 0);

-- Produtos de gás já cadastrados passam a controlar o vasilhame vazio.
update public.produtos set controla_vazio = true where categoria = 'gas';

alter table public.produtos
  add constraint produtos_vazio_so_se_controla
  check (controla_vazio or estoque_vazio = 0);

-- Cada movimentação diz se mexeu no estoque de cheios ou de vazios.
alter table public.movimentacoes_estoque
  add column tipo_estoque text not null default 'cheio'
    check (tipo_estoque in ('cheio', 'vazio'));


-- ------------------------------------------------------------
-- 2) registrar_venda
-- ------------------------------------------------------------
-- Entrada (p_dados), igual ao VendaCreate da API:
--   {
--     "origem": "atendimento" | "portaria",
--     "cliente_id": 1,                  -- obrigatório no atendimento
--     "endereco_id": 3,                 -- obrigatório no atendimento
--     "forma_pagamento": "pix" | "dinheiro" | "cartao_credito" | "cartao_debito",
--     "observacao_entregador": "texto", -- opcional
--     "itens": [ {"produto_id": 1, "quantidade": 2, "desconto": 10.00}, ... ]
--   }
-- Preço do produto e taxa de entrega são lidos AQUI, nunca enviados pelo front.
-- Valores: itens_venda.subtotal = quantidade * preço - desconto;
--          vendas.subtotal = soma dos subtotais (já com desconto);
--          vendas.total = subtotal + taxa de entrega.
-- Saída: { "venda": {...}, "itens": [...], "entrega": {...} | null }
create or replace function public.registrar_venda(
  p_dados jsonb,
  p_usuario_id uuid default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_origem      text    := p_dados->>'origem';
  v_forma       text    := p_dados->>'forma_pagamento';
  v_cliente_id  bigint;
  v_endereco_id bigint;
  v_obs         text    := nullif(btrim(coalesce(p_dados->>'observacao_entregador', '')), '');
  v_venda_id    bigint;
  v_entrega_id  bigint;
  v_regiao      text;
  v_taxa        numeric(10,2) := 0;
  v_subtotal    numeric(10,2) := 0;
  v_desconto    numeric(10,2) := 0;
  v_bruto       numeric(10,2);
  v_item_sub    numeric(10,2);
  r             record;
  v_prod        record;
begin
  -- Os casts ficam aqui (e não no declare) para que um valor inválido,
  -- como "abc", caia no tratamento de erro do final e vire UG422.
  v_cliente_id  := nullif(p_dados->>'cliente_id', '')::bigint;
  v_endereco_id := nullif(p_dados->>'endereco_id', '')::bigint;

  -- Validação básica ------------------------------------------------
  if v_origem is null or v_origem not in ('atendimento', 'portaria') then
    raise exception 'origem invalida' using errcode = 'UG422';
  end if;

  if v_forma is null
     or v_forma not in ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito') then
    raise exception 'forma_pagamento invalida' using errcode = 'UG422';
  end if;

  if jsonb_typeof(p_dados->'itens') is distinct from 'array'
     or jsonb_array_length(p_dados->'itens') = 0 then
    raise exception 'a venda precisa de ao menos um item' using errcode = 'UG422';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_dados->'itens') i
     where (i->>'produto_id') is null
        or coalesce((i->>'quantidade')::int, 0) <= 0
        or coalesce((i->>'desconto')::numeric, 0) < 0
  ) then
    raise exception 'item invalido (produto_id, quantidade > 0 e desconto >= 0)'
      using errcode = 'UG422';
  end if;

  -- Cliente e endereço ---------------------------------------------
  if v_origem = 'atendimento' then
    if v_cliente_id is null or v_endereco_id is null then
      raise exception 'atendimento exige cliente_id e endereco_id' using errcode = 'UG422';
    end if;
  elsif v_endereco_id is not null then
    raise exception 'venda de portaria nao tem endereco de entrega' using errcode = 'UG422';
  end if;

  if v_cliente_id is not null
     and not exists (select 1 from public.clientes where id = v_cliente_id) then
    raise exception 'cliente nao encontrado: %', v_cliente_id using errcode = 'UG404';
  end if;

  if v_endereco_id is not null then
    -- o endereço precisa ser do próprio cliente
    select rg.nome, coalesce(rg.taxa_entrega, 0)
      into v_regiao, v_taxa
      from public.enderecos e
      left join public.regioes rg on rg.id = e.regiao_id
     where e.id = v_endereco_id
       and e.cliente_id = v_cliente_id;
    if not found then
      raise exception 'endereco % nao encontrado para o cliente %',
        v_endereco_id, v_cliente_id using errcode = 'UG404';
    end if;
  end if;

  -- Venda (totais são fechados no final) ---------------------------
  insert into public.vendas
    (cliente_id, origem, forma_pagamento, subtotal, desconto, taxa_entrega, total,
     status, usuario_id)
  values
    (v_cliente_id, v_origem, v_forma, 0, 0, v_taxa, v_taxa, 'concluida', p_usuario_id)
  returning id into v_venda_id;

  -- Itens: um por produto, em ordem de id (evita deadlock) ----------
  for r in
    select (i->>'produto_id')::bigint                    as produto_id,
           sum((i->>'quantidade')::int)                  as quantidade,
           sum(coalesce((i->>'desconto')::numeric, 0))   as desconto
      from jsonb_array_elements(p_dados->'itens') i
     group by 1
     order by 1
  loop
    -- Baixa de cheios (+ soma de vazios) numa instrução só.
    -- A condição estoque_atual >= quantidade é o que impede a venda dupla.
    update public.produtos p
       set estoque_atual = p.estoque_atual - r.quantidade,
           estoque_vazio = p.estoque_vazio
                           + case when p.controla_vazio then r.quantidade else 0 end
     where p.id = r.produto_id
       and p.ativo
       and p.estoque_atual >= r.quantidade
    returning p.nome, p.preco, p.controla_vazio
      into v_prod;

    if not found then
      select p.nome, p.ativo, p.estoque_atual
        into v_prod
        from public.produtos p
       where p.id = r.produto_id;
      if not found then
        raise exception 'produto nao encontrado: %', r.produto_id using errcode = 'UG404';
      elsif not v_prod.ativo then
        raise exception 'produto inativo: %', v_prod.nome using errcode = 'UG422';
      else
        raise exception 'estoque insuficiente de % (disponivel %, pedido %)',
          v_prod.nome, v_prod.estoque_atual, r.quantidade using errcode = 'UG409';
      end if;
    end if;

    v_bruto := v_prod.preco * r.quantidade;
    if r.desconto > v_bruto then
      raise exception 'desconto maior que o valor do item %', v_prod.nome
        using errcode = 'UG422';
    end if;
    v_item_sub := v_bruto - r.desconto;

    insert into public.itens_venda
      (venda_id, produto_id, quantidade, preco_unitario, desconto, subtotal)
    values
      (v_venda_id, r.produto_id, r.quantidade, v_prod.preco, r.desconto, v_item_sub);

    insert into public.movimentacoes_estoque
      (produto_id, tipo, tipo_estoque, quantidade, origem, venda_id, usuario_id)
    values
      (r.produto_id, 'saida', 'cheio', r.quantidade, 'venda', v_venda_id, p_usuario_id);

    if v_prod.controla_vazio then
      insert into public.movimentacoes_estoque
        (produto_id, tipo, tipo_estoque, quantidade, origem, venda_id, usuario_id)
      values
        (r.produto_id, 'entrada', 'vazio', r.quantidade, 'venda', v_venda_id, p_usuario_id);
    end if;

    v_subtotal := v_subtotal + v_item_sub;
    v_desconto := v_desconto + r.desconto;
  end loop;

  update public.vendas
     set subtotal = v_subtotal,
         desconto = v_desconto,
         total    = v_subtotal + v_taxa
   where id = v_venda_id;

  -- Entrega pendente (só atendimento) -------------------------------
  if v_origem = 'atendimento' then
    insert into public.entregas (venda_id, endereco_id, observacao)
    values (v_venda_id, v_endereco_id, v_obs)
    returning id into v_entrega_id;
  end if;

  return jsonb_build_object(
    'venda', (select to_jsonb(v) from public.vendas v where v.id = v_venda_id),
    'itens', (
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'produto_id',     i.produto_id,
                 'produto_nome',   p.nome,
                 'quantidade',     i.quantidade,
                 'preco_unitario', i.preco_unitario,
                 'desconto',       i.desconto,
                 'subtotal',       i.subtotal)
               order by i.id), '[]'::jsonb)
        from public.itens_venda i
        join public.produtos p on p.id = i.produto_id
       where i.venda_id = v_venda_id
    ),
    'entrega', case
      when v_entrega_id is null then null
      else jsonb_build_object(
             'id', v_entrega_id,
             'status', 'pendente',
             'regiao', v_regiao,
             'entregador_id', null)
    end
  );

exception
  when invalid_text_representation
     or invalid_parameter_value
     or numeric_value_out_of_range
     or datatype_mismatch
     or check_violation then
    raise exception 'dados invalidos: %', sqlerrm using errcode = 'UG422';
end;
$$;

comment on function public.registrar_venda(jsonb, uuid) is
  'Registra venda, itens, baixa estoque (cheio -N, vazio +N) e cria entrega. Erros: UG404, UG409, UG422.';


-- ------------------------------------------------------------
-- 3) cancelar_venda
-- ------------------------------------------------------------
-- Usada pelo PATCH /entregas/{id} com status "cancelada" (e para cancelar
-- vendas de portaria). Devolve os cheios, retira os vazios e cancela a
-- venda e a entrega. Não cancela entrega já realizada.
-- Se os vazios em estoque forem menos que os a retirar (ex.: já foram
-- enviados à distribuidora), retira só o que existe e registra isso na
-- observação da movimentação, para o cancelamento nunca ficar bloqueado.
create or replace function public.cancelar_venda(
  p_venda_id bigint,
  p_usuario_id uuid default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_venda          record;
  v_entrega_status text;
  v_prod           record;
  v_removido       integer;
  r                record;
begin
  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then
    raise exception 'venda nao encontrada: %', p_venda_id using errcode = 'UG404';
  end if;
  if v_venda.status = 'cancelada' then
    raise exception 'venda % ja esta cancelada', p_venda_id using errcode = 'UG409';
  end if;

  select status into v_entrega_status
    from public.entregas where venda_id = p_venda_id for update;
  if v_entrega_status = 'entregue' then
    raise exception 'entrega da venda % ja foi realizada', p_venda_id using errcode = 'UG409';
  end if;

  for r in
    select produto_id, sum(quantidade)::int as quantidade
      from public.itens_venda
     where venda_id = p_venda_id
     group by produto_id
     order by produto_id
  loop
    select controla_vazio, estoque_vazio
      into v_prod
      from public.produtos
     where id = r.produto_id
       for update;

    v_removido := case when v_prod.controla_vazio
                       then least(r.quantidade, v_prod.estoque_vazio)
                       else 0 end;

    update public.produtos
       set estoque_atual = estoque_atual + r.quantidade,
           estoque_vazio = estoque_vazio - v_removido
     where id = r.produto_id;

    insert into public.movimentacoes_estoque
      (produto_id, tipo, tipo_estoque, quantidade, origem, venda_id, usuario_id)
    values
      (r.produto_id, 'entrada', 'cheio', r.quantidade, 'cancelamento', p_venda_id, p_usuario_id);

    if v_removido > 0 then
      insert into public.movimentacoes_estoque
        (produto_id, tipo, tipo_estoque, quantidade, origem, venda_id, usuario_id, observacao)
      values
        (r.produto_id, 'saida', 'vazio', v_removido, 'cancelamento', p_venda_id, p_usuario_id,
         case when v_removido < r.quantidade
              then format('vazios insuficientes: esperado %s, retirado %s',
                          r.quantidade, v_removido)
         end);
    end if;
  end loop;

  update public.vendas set status = 'cancelada' where id = p_venda_id;
  update public.entregas
     set status = 'cancelada'
   where venda_id = p_venda_id;

  return jsonb_build_object(
    'venda_id', p_venda_id,
    'status', 'cancelada',
    'entrega_cancelada', v_entrega_status is not null
  );
end;
$$;

comment on function public.cancelar_venda(bigint, uuid) is
  'Cancela venda e entrega e desfaz o estoque (cheio +N, vazio -N). Erros: UG404, UG409.';


-- ------------------------------------------------------------
-- 4) movimentar_estoque (tela Controle de Estoque)
-- ------------------------------------------------------------
--   p_estoque : 'cheio' | 'vazio'  (qual estoque a movimentação altera)
--   p_tipo    : 'entrada' | 'saida'
--   p_origem  : 'compra' | 'ajuste' | 'troca_vazio'
--
-- 'troca_vazio' é a troca com a distribuidora: sai N vazios e entram N
-- cheios (ignora p_estoque e p_tipo). Vendas e cancelamentos têm função
-- própria, por isso 'venda' e 'cancelamento' não são aceitos aqui.
create or replace function public.movimentar_estoque(
  p_produto_id bigint,
  p_estoque text,
  p_tipo text,
  p_quantidade integer,
  p_origem text default 'ajuste',
  p_observacao text default null,
  p_usuario_id uuid default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_prod    record;
  v_delta   integer;
  v_cheio   integer;
  v_vazio   integer;
begin
  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'quantidade deve ser maior que zero' using errcode = 'UG422';
  end if;
  if p_origem is null or p_origem not in ('compra', 'ajuste', 'troca_vazio') then
    raise exception 'origem invalida para movimentacao manual: %', p_origem
      using errcode = 'UG422';
  end if;
  if p_origem <> 'troca_vazio' then
    if p_tipo is null or p_tipo not in ('entrada', 'saida') then
      raise exception 'tipo invalido: %', p_tipo using errcode = 'UG422';
    end if;
    if p_estoque is null or p_estoque not in ('cheio', 'vazio') then
      raise exception 'estoque invalido: %', p_estoque using errcode = 'UG422';
    end if;
  end if;

  select * into v_prod from public.produtos where id = p_produto_id for update;
  if not found then
    raise exception 'produto nao encontrado: %', p_produto_id using errcode = 'UG404';
  end if;

  if p_origem = 'troca_vazio' then
    if not v_prod.controla_vazio then
      raise exception 'produto % nao controla vasilhame vazio', v_prod.nome
        using errcode = 'UG422';
    end if;
    if v_prod.estoque_vazio < p_quantidade then
      raise exception 'vazios insuficientes de % (disponivel %, pedido %)',
        v_prod.nome, v_prod.estoque_vazio, p_quantidade using errcode = 'UG409';
    end if;

    v_cheio := v_prod.estoque_atual + p_quantidade;
    v_vazio := v_prod.estoque_vazio - p_quantidade;

    insert into public.movimentacoes_estoque
      (produto_id, tipo, tipo_estoque, quantidade, origem, observacao, usuario_id)
    values
      (p_produto_id, 'saida',   'vazio', p_quantidade, 'troca_vazio', p_observacao, p_usuario_id),
      (p_produto_id, 'entrada', 'cheio', p_quantidade, 'troca_vazio', p_observacao, p_usuario_id);
  else
    if p_estoque = 'vazio' and not v_prod.controla_vazio then
      raise exception 'produto % nao controla vasilhame vazio', v_prod.nome
        using errcode = 'UG422';
    end if;

    v_delta := case when p_tipo = 'entrada' then p_quantidade else -p_quantidade end;
    v_cheio := v_prod.estoque_atual + case when p_estoque = 'cheio' then v_delta else 0 end;
    v_vazio := v_prod.estoque_vazio + case when p_estoque = 'vazio' then v_delta else 0 end;

    if v_cheio < 0 or v_vazio < 0 then
      raise exception 'estoque insuficiente de % para essa saida', v_prod.nome
        using errcode = 'UG409';
    end if;

    insert into public.movimentacoes_estoque
      (produto_id, tipo, tipo_estoque, quantidade, origem, observacao, usuario_id)
    values
      (p_produto_id, p_tipo, p_estoque, p_quantidade, p_origem, p_observacao, p_usuario_id);
  end if;

  update public.produtos
     set estoque_atual = v_cheio,
         estoque_vazio = v_vazio
   where id = p_produto_id;

  return jsonb_build_object(
    'produto_id', p_produto_id,
    'estoque_atual', v_cheio,
    'estoque_vazio', v_vazio
  );
end;
$$;

comment on function public.movimentar_estoque(bigint, text, text, integer, text, text, uuid) is
  'Entrada/saida manual de estoque cheio ou vazio e troca de vazio. Erros: UG404, UG409, UG422.';


-- ------------------------------------------------------------
-- 5) Segurança: só a API (service_role) pode chamar as funções
-- ------------------------------------------------------------
-- Sem isto, qualquer pessoa com a chave anon (que fica no front-end)
-- chamaria /rest/v1/rpc/registrar_venda direto, sem passar pela API.
-- As funções são "security invoker" (padrão): rodam com as permissões
-- de quem chama, e a service_role é a única com acesso.
revoke execute on function public.registrar_venda(jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.registrar_venda(jsonb, uuid) to service_role;

revoke execute on function public.cancelar_venda(bigint, uuid)
  from public, anon, authenticated;
grant execute on function public.cancelar_venda(bigint, uuid) to service_role;

revoke execute on function public.movimentar_estoque(bigint, text, text, integer, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.movimentar_estoque(bigint, text, text, integer, text, text, uuid)
  to service_role;
