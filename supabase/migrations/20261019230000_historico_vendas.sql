create or replace function public.historico_vendas(
  p_inicio          timestamptz default null,
  p_fim             timestamptz default null,
  p_cliente_id      bigint      default null,
  p_forma_pagamento text        default null,
  p_status          text        default null,
  p_venda_id        bigint      default null,
  p_nome_cliente    text        default null,
  p_ordem           text        default 'mais_recentes',
  p_limite          integer     default 20,
  p_deslocamento    integer     default 0
)
returns jsonb
language plpgsql
stable
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_nome_buscado          text := nullif(btrim(p_nome_cliente), '');
  v_nome_como_padrao_like text;
begin
  if p_ordem not in ('mais_recentes', 'mais_antigas', 'maior_valor') then
    raise exception 'ordem invalida: %', p_ordem using errcode = 'UG422';
  end if;
  if p_limite is null or p_limite not between 1 and 100
     or p_deslocamento is null or p_deslocamento < 0 then
    raise exception 'paginacao invalida' using errcode = 'UG422';
  end if;

  if v_nome_buscado is not null then
    v_nome_como_padrao_like := '%' || replace(replace(replace(v_nome_buscado,
                                 '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return (
    with filtradas as (
      select v.id, v.criado_em, v.cliente_id, c.nome as cliente_nome,
             v.forma_pagamento, v.total, v.status,
             (p_status is not null or v.status <> 'cancelada') as conta_nos_totais,
             row_number() over (order by
               case when p_ordem = 'maior_valor'  then v.total     end desc,
               case when p_ordem = 'mais_antigas' then v.criado_em end asc,
               case when p_ordem = 'mais_antigas' then v.id        end asc,
               v.criado_em desc,
               v.id desc) as posicao
        from public.vendas v
        left join public.clientes c on c.id = v.cliente_id
       where (p_inicio is null or v.criado_em >= p_inicio)
         and (p_fim is null or v.criado_em < p_fim)
         and (p_cliente_id is null or v.cliente_id = p_cliente_id)
         and (p_forma_pagamento is null or v.forma_pagamento = p_forma_pagamento)
         and (p_status is null or v.status = p_status)
         and (p_venda_id is null or v.id = p_venda_id)
         and (v_nome_como_padrao_like is null or c.nome ilike v_nome_como_padrao_like)
    )
    select jsonb_build_object(
      'totais', jsonb_build_object(
        'total_vendas',       coalesce(sum(f.total) filter (where f.conta_nos_totais), 0),
        'quantidade_vendas',  count(*) filter (where f.conta_nos_totais),
        'clientes_atendidos', count(distinct f.cliente_id) filter (where f.conta_nos_totais),
        'ticket_medio',       coalesce(round(avg(f.total) filter (where f.conta_nos_totais), 2), 0)
      ),
      'total', count(*),
      'itens', coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',              f.id,
            'criado_em',       f.criado_em,
            'cliente_id',      f.cliente_id,
            'cliente_nome',    f.cliente_nome,
            'forma_pagamento', f.forma_pagamento,
            'total',           f.total,
            'status',          f.status,
            'itens', (
              select coalesce(jsonb_agg(jsonb_build_object('produto_nome', pr.nome,
                                                           'quantidade',   i.quantidade)
                                        order by i.id), '[]'::jsonb)
                from public.itens_venda i
                join public.produtos pr on pr.id = i.produto_id
               where i.venda_id = f.id
            )
          )
          order by f.posicao
        ) filter (where f.posicao > p_deslocamento and f.posicao <= p_deslocamento + p_limite),
        '[]'::jsonb
      )
    )
    from filtradas f
  );
end;
$$;

comment on function public.historico_vendas(
  timestamptz, timestamptz, bigint, text, text, bigint, text, text, integer, integer
) is 'Histórico de vendas: página da lista + totais com o mesmo filtro (canceladas fora dos totais, salvo status=cancelada). Período [p_inicio, p_fim). Erros: UG422.';

revoke execute on function public.historico_vendas(
  timestamptz, timestamptz, bigint, text, text, bigint, text, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.historico_vendas(
  timestamptz, timestamptz, bigint, text, text, bigint, text, text, integer, integer
) to service_role;
