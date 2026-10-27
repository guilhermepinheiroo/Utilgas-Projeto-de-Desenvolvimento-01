-- Junta produtos com o mesmo nome (ignora maiúsculas e espaços).
-- Fica o mais antigo (ativo primeiro); vendas e movimentações das cópias passam para ele.
-- O estoque que vale é o do produto que fica. Confira depois na tela de Estoque.

-- 1) Ver o que está duplicado
select lower(btrim(nome)) as produto,
       count(*) as copias,
       array_agg(id order by id) as ids,
       array_agg(estoque_atual order by id) as cheios
  from public.produtos
 group by 1
having count(*) > 1;

-- 2) Corrigir
begin;

create temp table duplicados on commit drop as
select id, manter
  from (
    select id,
           first_value(id) over (
             partition by lower(btrim(nome))
             order by ativo desc, id
           ) as manter
      from public.produtos
  ) t
 where id <> manter;

update public.itens_venda i
   set produto_id = d.manter
  from duplicados d
 where i.produto_id = d.id;

update public.movimentacoes_estoque m
   set produto_id = d.manter
  from duplicados d
 where m.produto_id = d.id;

delete from public.produtos p
 using duplicados d
 where p.id = d.id;

commit;

-- 3) Conferir: não deve retornar nada
select lower(btrim(nome)), count(*) from public.produtos group by 1 having count(*) > 1;
