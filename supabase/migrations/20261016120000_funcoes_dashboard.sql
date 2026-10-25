-- ============================================================
-- UtilGás — funções de leitura do Dashboard
-- ============================================================
-- Só consultas (stable). Vendas canceladas nunca entram no faturamento.
-- "Dia" é o dia no fuso de Brasília: o banco guarda em UTC e uma venda
-- feita às 22h cairia no dia seguinte sem a conversão.
-- Intervalo [p_inicio, p_fim] inclusivo nas duas pontas.
-- ============================================================

create or replace function public.dashboard_faturamento(p_inicio date, p_fim date)
returns table (faturamento numeric, qtd_vendas bigint, ticket_medio numeric)
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(v.total), 0)::numeric,
         count(*),
         coalesce(round(avg(v.total), 2), 0)::numeric
    from public.vendas v
   where v.status <> 'cancelada'
     and (v.criado_em at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim;
$$;

create or replace function public.dashboard_vendas_diarias(p_inicio date, p_fim date)
returns table (dia date, qtd_vendas bigint, faturamento numeric)
language sql
stable
set search_path = ''
as $$
  -- generate_series devolve também os dias sem venda (com zero), o que
  -- evita "buracos" no gráfico do front.
  select d::date,
         count(v.id),
         coalesce(sum(v.total), 0)::numeric
    from generate_series(p_inicio, p_fim, interval '1 day') d
    left join public.vendas v
           on (v.criado_em at time zone 'America/Sao_Paulo')::date = d::date
          and v.status <> 'cancelada'
   group by d
   order by d;
$$;

revoke execute on function public.dashboard_faturamento(date, date)
  from public, anon, authenticated;
grant execute on function public.dashboard_faturamento(date, date) to service_role;

revoke execute on function public.dashboard_vendas_diarias(date, date)
  from public, anon, authenticated;
grant execute on function public.dashboard_vendas_diarias(date, date) to service_role;