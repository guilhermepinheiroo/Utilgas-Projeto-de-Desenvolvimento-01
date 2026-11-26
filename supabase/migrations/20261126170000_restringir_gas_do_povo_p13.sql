create or replace function public.registrar_venda(
  p_dados jsonb,
  p_usuario_id uuid default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_origem         text    := p_dados->>'origem';
  v_forma          text    := p_dados->>'forma_pagamento';
  v_cliente_id     bigint;
  v_endereco_id    bigint;
  v_obs            text    := nullif(btrim(coalesce(p_dados->>'observacao_entregador', '')), '');
  v_venda_id       bigint;
  v_entrega_id     bigint;
  v_regiao         text;
  v_taxa           numeric(10,2) := 0;
  v_subtotal       numeric(10,2) := 0;
  v_desconto       numeric(10,2) := 0;
  v_bruto          numeric(10,2);
  v_item_sub       numeric(10,2);
  v_desconto_item  numeric(10,2);
  v_tem_p13        boolean := false;
  r                record;
  v_prod           record;
begin
  v_cliente_id  := nullif(p_dados->>'cliente_id', '')::bigint;
  v_endereco_id := nullif(p_dados->>'endereco_id', '')::bigint;

  if v_origem is null or v_origem not in ('atendimento', 'portaria') then
    raise exception 'origem invalida' using errcode = 'UG422';
  end if;

  if v_forma is null
     or v_forma not in ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'gas_do_povo') then
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

  insert into public.vendas
    (cliente_id, origem, forma_pagamento, subtotal, desconto, taxa_entrega, total,
     status, usuario_id)
  values
    (v_cliente_id, v_origem, v_forma, 0, 0, v_taxa, v_taxa, 'concluida', p_usuario_id)
  returning id into v_venda_id;

  for r in
    select (i->>'produto_id')::bigint                    as produto_id,
           sum((i->>'quantidade')::int)                  as quantidade,
           sum(coalesce((i->>'desconto')::numeric, 0))   as desconto
      from jsonb_array_elements(p_dados->'itens') i
     group by 1
     order by 1
  loop
    update public.produtos p
       set estoque_atual = p.estoque_atual - r.quantidade,
           estoque_vazio = p.estoque_vazio
                           + case when p.controla_vazio then r.quantidade else 0 end
     where p.id = r.produto_id
       and p.ativo
       and p.estoque_atual >= r.quantidade
    returning p.nome, p.preco, p.controla_vazio, p.categoria
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

    v_desconto_item := r.desconto;
    if v_forma = 'gas_do_povo'
       and v_prod.categoria = 'gas'
       and v_prod.nome ~* '(^|[^[:alnum:]])P13([^[:alnum:]]|$)' then
      v_desconto_item := v_bruto;
      v_tem_p13 := true;
    end if;
    v_item_sub := v_bruto - v_desconto_item;

    insert into public.itens_venda
      (venda_id, produto_id, quantidade, preco_unitario, desconto, subtotal)
    values
      (v_venda_id, r.produto_id, r.quantidade, v_prod.preco, v_desconto_item, v_item_sub);

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
    v_desconto := v_desconto + v_desconto_item;
  end loop;

  if v_forma = 'gas_do_povo' and not v_tem_p13 then
    raise exception 'Gás do Povo exige botijao P13' using errcode = 'UG422';
  end if;

  update public.vendas
     set subtotal = v_subtotal,
         desconto = v_desconto,
         total    = v_subtotal + v_taxa
   where id = v_venda_id;

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
  'Registra venda, itens, estoque e entrega. O Gás do Povo subsidia apenas botijões P13 da categoria gas.';
