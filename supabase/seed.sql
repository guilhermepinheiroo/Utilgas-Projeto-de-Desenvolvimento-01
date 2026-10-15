-- Dados de exemplo para DESENVOLVIMENTO. Não rode em produção.
-- Rode uma vez no SQL Editor do projeto dev (ou use `supabase db reset` no banco local).

insert into public.regioes (nome, taxa_entrega) values
  ('Areal', 8.00),
  ('Zona Sul', 8.00),
  ('Centro', 5.00)
on conflict (nome) do nothing;

insert into public.produtos (nome, categoria, preco, estoque_atual, estoque_minimo) values
  ('Botijão P13 - Recarga', 'gas', 115.00, 40, 10),
  ('Botijão P45 - Recarga', 'gas', 420.00, 12, 4),
  ('Botijão P13 Completo', 'gas', 295.00, 8, 3),
  ('Água Mineral 20L', 'agua', 18.00, 60, 15),
  ('Kit Registro + Mangueira', 'acessorio', 40.00, 20, 5);

insert into public.entregadores (nome, telefone) values
  ('João Costa', null),
  ('Lucas Ribeiro', null);
