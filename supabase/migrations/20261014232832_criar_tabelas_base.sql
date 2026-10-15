create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;


-- Perfis de usuário (vinculados ao Supabase Auth)

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel text not null default 'operador'
    check (papel in ('operador', 'admin')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);


-- Regiões de entrega (define a taxa de entrega)

create table public.regioes (
  id bigint generated always as identity primary key,
  nome text not null unique,
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  ativo boolean not null default true
);


-- Clientes e endereços

create table public.clientes (
  id bigint generated always as identity primary key,
  nome text not null,
  telefone text not null unique,         
  cpf_cnpj text unique,
  email text,
  observacoes text,
  status text not null default 'ativo'
    check (status in ('ativo', 'inativo', 'inadimplente')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger trg_clientes_atualizado_em
  before update on public.clientes
  for each row execute function public.set_atualizado_em();

create table public.enderecos (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes (id) on delete cascade,
  endereco text not null,                 
  complemento text,
  cep text,
  bairro text,
  regiao_id bigint references public.regioes (id),
  principal boolean not null default false,
  criado_em timestamptz not null default now()
);

create index idx_enderecos_cliente on public.enderecos (cliente_id);

-- Apenas um endereço principal por cliente
create unique index uq_endereco_principal
  on public.enderecos (cliente_id) where principal;


-- Produtos e estoque

create table public.produtos (
  id bigint generated always as identity primary key,
  nome text not null,
  categoria text not null
    check (categoria in ('gas', 'agua', 'acessorio')),
  preco numeric(10,2) not null check (preco >= 0),
  estoque_atual integer not null default 0 check (estoque_atual >= 0),
  estoque_minimo integer not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger trg_produtos_atualizado_em
  before update on public.produtos
  for each row execute function public.set_atualizado_em();

-- Vendas e itens

create table public.vendas (
  id bigint generated always as identity primary key,
  cliente_id bigint references public.clientes (id),   
  origem text not null
    check (origem in ('atendimento', 'portaria')),
  forma_pagamento text not null
    check (forma_pagamento in ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  desconto numeric(10,2) not null default 0 check (desconto >= 0),
  taxa_entrega numeric(10,2) not null default 0 check (taxa_entrega >= 0),
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'concluida'
    check (status in ('pendente', 'concluida', 'cancelada')),
  usuario_id uuid references public.perfis (id),       
  criado_em timestamptz not null default now()
);

create index idx_vendas_cliente on public.vendas (cliente_id);
create index idx_vendas_criado_em on public.vendas (criado_em);

create table public.itens_venda (
  id bigint generated always as identity primary key,
  venda_id bigint not null references public.vendas (id) on delete cascade,
  produto_id bigint not null references public.produtos (id),
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),  
  desconto numeric(10,2) not null default 0 check (desconto >= 0),
  subtotal numeric(10,2) not null check (subtotal >= 0)
);

create index idx_itens_venda_venda on public.itens_venda (venda_id);

-- Movimentações de estoque

create table public.movimentacoes_estoque (
  id bigint generated always as identity primary key,
  produto_id bigint not null references public.produtos (id),
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  origem text not null default 'ajuste'
    check (origem in ('compra', 'venda', 'cancelamento', 'troca_vazio', 'ajuste')),
  venda_id bigint references public.vendas (id),
  usuario_id uuid references public.perfis (id),
  observacao text,
  criado_em timestamptz not null default now()
);

create index idx_mov_estoque_produto on public.movimentacoes_estoque (produto_id);
create index idx_mov_estoque_criado_em on public.movimentacoes_estoque (criado_em);

-- Entregadores e entregas

create table public.entregadores (
  id bigint generated always as identity primary key,
  nome text not null,
  telefone text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.entregas (
  id bigint generated always as identity primary key,
  venda_id bigint not null unique references public.vendas (id) on delete cascade,
  endereco_id bigint references public.enderecos (id),
  entregador_id bigint references public.entregadores (id),  
  status text not null default 'pendente'
    check (status in ('pendente', 'entregue', 'cancelada')),
  observacao text,                        
  entregue_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_entregas_status on public.entregas (status);
create index idx_entregas_entregador on public.entregas (entregador_id);

create trigger trg_entregas_atualizado_em
  before update on public.entregas
  for each row execute function public.set_atualizado_em();




alter table public.perfis enable row level security;
alter table public.regioes enable row level security;
alter table public.clientes enable row level security;
alter table public.enderecos enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.itens_venda enable row level security;
alter table public.movimentacoes_estoque enable row level security;
alter table public.entregadores enable row level security;
alter table public.entregas enable row level security;