-- Dados de exemplo para DESENVOLVIMENTO. Não rode em produção.
-- Pode ser executado mais de uma vez: não duplica o que já existe.
--   Supabase local:  npx supabase db reset   (aplica as migrations e depois este arquivo)
--   Supabase dev:    cole no SQL Editor do projeto dev e clique em Run.

-- Regiões de entrega (a taxa vem da região do endereço)
insert into public.regioes (nome, taxa_entrega) values
  ('Areal', 8.00),
  ('Zona Sul', 8.00),
  ('Centro', 5.00)
on conflict (nome) do nothing;

-- Produtos
--   estoque_atual  = unidades cheias
--   estoque_vazio  = vasilhames vazios (só para controla_vazio = true)
insert into public.produtos
  (nome, categoria, preco, estoque_atual, estoque_vazio, estoque_minimo, controla_vazio)
select v.*
from (values
  ('Botijão P13 - Recarga',    'gas',       115.00, 40, 15, 10, true),
  ('Botijão P45 - Recarga',    'gas',       420.00, 12,  4,  4, true),
  ('Botijão P13 Completo',     'gas',       295.00,  8,  0,  3, false),
  ('Água Mineral 20L',         'agua',       18.00, 60,  0, 15, false),
  ('Kit Registro + Mangueira', 'acessorio',  40.00, 20,  0,  5, false)
) as v(nome, categoria, preco, estoque_atual, estoque_vazio, estoque_minimo, controla_vazio)
where not exists (select 1 from public.produtos p where p.nome = v.nome);

-- Botijão vendido com casco novo: o cliente não devolve vazio, então não controla vazio.
-- (Repete o ajuste para bancos que já tinham este produto cadastrado.)
update public.produtos set controla_vazio = false, estoque_vazio = 0
 where nome = 'Botijão P13 Completo';

-- Entregadores
insert into public.entregadores (nome)
select v.nome
from (values ('João Costa'), ('Lucas Ribeiro')) as v(nome)
where not exists (select 1 from public.entregadores e where e.nome = v.nome);

-- Cliente de exemplo (o mesmo do protótipo), com dois endereços
insert into public.clientes (nome, telefone, email, observacoes)
values ('Maria Souza', '53988124477', 'maria.souza@gmail.com', 'Prefere entrega após as 14h.')
on conflict (telefone) do nothing;

insert into public.enderecos (cliente_id, endereco, complemento, cep, bairro, regiao_id, principal)
select c.id, v.endereco, v.complemento, v.cep, v.bairro, r.id, v.principal
from public.clientes c
cross join (values
  ('R. Santos Dumont, 412', 'casa',  '96077-520', 'Areal',  'Areal',  true),
  ('Av. Rio Branco, 88',    null,    '96010-000', 'Centro', 'Centro', false)
) as v(endereco, complemento, cep, bairro, regiao, principal)
join public.regioes r on r.nome = v.regiao
where c.telefone = '53988124477'
  and not exists (
    select 1 from public.enderecos e
     where e.cliente_id = c.id and e.endereco = v.endereco
  );
