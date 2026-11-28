-- Clientes: inadimplência + cadastro atômico
--
-- 1) Guarda os dados da inadimplência (desde quando, motivo, valor devido).
-- 2) Um trigger mantém esses campos coerentes com clientes.status, não importa
--    por qual rota a mudança chegue (PUT /clientes/{id}, endpoints de
--    inadimplência, SQL Editor...).
-- 3) Constraints impedem gravar uma classificação inconsistente.
-- 4) criar_cliente(): cadastra cliente + endereços numa única transação.


-- 1) Colunas -------------------------------------------------------------

alter table public.clientes
  add column inadimplente_desde timestamptz,
  add column motivo_inadimplencia text,
  add column valor_devido numeric(10,2) check (valor_devido is null or valor_devido >= 0);

-- Quem já estava como inadimplente antes desta migration recebe uma data.
update public.clientes
   set inadimplente_desde = atualizado_em
 where status = 'inadimplente'
   and inadimplente_desde is null;


-- 2) Trigger -------------------------------------------------------------
-- Ao ENTRAR em 'inadimplente': inadimplente_desde = agora.
-- Enquanto continuar inadimplente: a data original é preservada.
-- Ao SAIR de 'inadimplente': data, motivo e valor são zerados.

create or replace function public.clientes_sincroniza_inadimplencia()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'inadimplente' then
    if tg_op = 'INSERT' or old.status is distinct from 'inadimplente' then
      new.inadimplente_desde := now();
    else
      new.inadimplente_desde := old.inadimplente_desde;
    end if;
  else
    new.inadimplente_desde := null;
    new.motivo_inadimplencia := null;
    new.valor_devido := null;
  end if;
  return new;
end;
$$;

create trigger trg_clientes_inadimplencia
  before insert or update on public.clientes
  for each row execute function public.clientes_sincroniza_inadimplencia();


-- 3) Constraints ---------------------------------------------------------

alter table public.clientes
  add constraint ck_clientes_inadimplencia_coerente check (
    (status = 'inadimplente' and inadimplente_desde is not null)
    or (status <> 'inadimplente'
        and inadimplente_desde is null
        and motivo_inadimplencia is null
        and valor_devido is null)
  );

create index idx_clientes_inadimplentes
  on public.clientes (inadimplente_desde)
  where status = 'inadimplente';


-- 4) Cadastro atômico ----------------------------------------------------
-- A API antes inseria o cliente e depois os endereços em duas chamadas, apagando
-- o cliente "na mão" se a segunda falhasse. Aqui é tudo uma transação só: se
-- qualquer parte falha, nada é gravado.
--
-- Erros de unicidade (telefone/CPF) continuam saindo como 23505, e a API os
-- converte em 409.

create or replace function public.criar_cliente(p_cliente jsonb, p_enderecos jsonb default '[]')
returns bigint
language plpgsql
as $$
declare
  v_id bigint;
begin
  if coalesce(trim(p_cliente->>'nome'), '') = '' then
    raise exception 'nome obrigatorio' using errcode = 'UG422';
  end if;
  if coalesce(p_cliente->>'telefone', '') = '' then
    raise exception 'telefone obrigatorio' using errcode = 'UG422';
  end if;
  if jsonb_typeof(coalesce(p_enderecos, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'enderecos deve ser uma lista' using errcode = 'UG422';
  end if;

  insert into public.clientes (nome, telefone, cpf_cnpj, email, observacoes, status)
  values (
    trim(p_cliente->>'nome'),
    p_cliente->>'telefone',
    nullif(p_cliente->>'cpf_cnpj', ''),
    nullif(p_cliente->>'email', ''),
    nullif(p_cliente->>'observacoes', ''),
    coalesce(nullif(p_cliente->>'status', ''), 'ativo')
  )
  returning id into v_id;

  insert into public.enderecos
    (cliente_id, endereco, complemento, ponto_referencia, cep, bairro, regiao_id, principal)
  select
    v_id,
    e->>'endereco',
    nullif(e->>'complemento', ''),
    nullif(e->>'ponto_referencia', ''),
    nullif(e->>'cep', ''),
    nullif(e->>'bairro', ''),
    nullif(e->>'regiao_id', '')::bigint,
    coalesce((e->>'principal')::boolean, false)
  from jsonb_array_elements(coalesce(p_enderecos, '[]'::jsonb)) e;

  return v_id;
end;
$$;

-- Só a API (service_role) chama; a chave anon do front não deve conseguir.
revoke execute on function public.criar_cliente(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.criar_cliente(jsonb, jsonb) to service_role;
