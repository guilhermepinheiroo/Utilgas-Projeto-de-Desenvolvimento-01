create table public.maquininhas (
  id bigint generated always as identity primary key,
  nome text not null check (btrim(nome) <> ''),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create unique index maquininhas_nome_unico on public.maquininhas (lower(btrim(nome)));

create table public.bandeiras (
  id bigint generated always as identity primary key,
  nome text not null check (btrim(nome) <> ''),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create unique index bandeiras_nome_unico on public.bandeiras (lower(btrim(nome)));

insert into public.bandeiras (nome) values
  ('Visa'),
  ('Mastercard'),
  ('Elo'),
  ('Hipercard'),
  ('Banricompras');

alter table public.maquininhas enable row level security;
alter table public.bandeiras enable row level security;

comment on table public.maquininhas is
  'Maquininhas de cartão da revenda. Desativar não apaga: as vendas antigas continuam ligadas a ela.';
comment on table public.bandeiras is
  'Bandeiras de cartão aceitas. Lista editável pela tela; desativar não apaga o histórico.';

alter table public.vendas
  add column maquininha_id bigint references public.maquininhas (id),
  add column bandeira_id bigint references public.bandeiras (id),
  add constraint vendas_maquininha_e_bandeira_so_no_cartao
    check (forma_pagamento in ('cartao_credito', 'cartao_debito')
           or (maquininha_id is null and bandeira_id is null));

create index idx_vendas_maquininha on public.vendas (maquininha_id);
create index idx_vendas_bandeira on public.vendas (bandeira_id);

comment on column public.vendas.maquininha_id is
  'Maquininha usada. Obrigatória nas vendas em cartão feitas a partir desta migration.';
comment on column public.vendas.bandeira_id is
  'Bandeira do cartão. Obrigatória nas vendas em cartão feitas a partir desta migration.';


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
  v_maquininha_id bigint;
  v_bandeira_id   bigint;
  v_meio_cartao   record;
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
  v_maquininha_id := nullif(p_dados->>'maquininha_id', '')::bigint;
  v_bandeira_id   := nullif(p_dados->>'bandeira_id', '')::bigint;

  -- Validação básica ------------------------------------------------
  if v_origem is null or v_origem not in ('atendimento', 'portaria') then
    raise exception 'origem invalida' using errcode = 'UG422';
  end if;

  if v_forma is null
     or v_forma not in ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito') then
    raise exception 'forma_pagamento invalida' using errcode = 'UG422';
  end if;

  if v_forma in ('cartao_credito', 'cartao_debito') then
    if v_maquininha_id is null or v_bandeira_id is null then
      raise exception 'pagamento com cartao exige maquininha e bandeira' using errcode = 'UG422';
    end if;

    select nome, ativo into v_meio_cartao from public.maquininhas where id = v_maquininha_id;
    if not found then
      raise exception 'maquininha nao encontrada: %', v_maquininha_id using errcode = 'UG404';
    elsif not v_meio_cartao.ativo then
      raise exception 'maquininha inativa: %', v_meio_cartao.nome using errcode = 'UG422';
    end if;

    select nome, ativo into v_meio_cartao from public.bandeiras where id = v_bandeira_id;
    if not found then
      raise exception 'bandeira nao encontrada: %', v_bandeira_id using errcode = 'UG404';
    elsif not v_meio_cartao.ativo then
      raise exception 'bandeira inativa: %', v_meio_cartao.nome using errcode = 'UG422';
    end if;
  elsif v_maquininha_id is not null or v_bandeira_id is not null then
    raise exception 'maquininha e bandeira so valem para pagamento com cartao'
      using errcode = 'UG422';
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
    (cliente_id, origem, forma_pagamento, maquininha_id, bandeira_id,
     subtotal, desconto, taxa_entrega, total, status, usuario_id)
  values
    (v_cliente_id, v_origem, v_forma, v_maquininha_id, v_bandeira_id,
     0, 0, v_taxa, v_taxa, 'concluida', p_usuario_id)
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
  'Registra venda, itens, baixa estoque (cheio -N, vazio +N) e cria entrega. Pagamento em cartão exige maquininha_id e bandeira_id ativas. Erros: UG404, UG409, UG422.';

revoke execute on function public.registrar_venda(jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.registrar_venda(jsonb, uuid) to service_role;
