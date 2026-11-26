alter table public.entregadores
  add column cpf text,
  add column tipo_veiculo text,
  add column placa text,
  add column pix_observacoes text;

create unique index idx_entregadores_cpf_unique
  on public.entregadores (cpf)
  where cpf is not null;
