# UtilGás — Sistema de Gerenciamento de Revenda de Gás

Sistema web para uma revenda de gás: atendimento por telefone, vendas, portaria, entregas, clientes, estoque e dashboard.

| Camada | Tecnologia | Pasta |
|---|---|---|
| Front-end | React 19 + TypeScript + Tailwind 4 + Vite | `Frontend/` |
| Back-end | Python + FastAPI | `backend/` |
| Banco de dados | Supabase (PostgreSQL) + Supabase Auth | `supabase/` |

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Primeiro acesso ao projeto](#2-primeiro-acesso-ao-projeto)
3. [Banco de dados (Supabase)](#3-banco-de-dados-supabase)
4. [Rodando o back-end](#4-rodando-o-back-end)
5. [Rodando o front-end](#5-rodando-o-front-end)
6. [Fluxo de trabalho com Git](#6-fluxo-de-trabalho-com-git)
7. [Estrutura e responsabilidades](#7-estrutura-e-responsabilidades)
8. [Escopo da entrega (04/11/2026)](#8-escopo-da-entrega-04112026)
9. [Problemas comuns](#9-problemas-comuns)

---

## 1. Pré-requisitos

Instale antes de começar:

- **Git**
- **Python 3.11 ou superior** — confira com `python --version`
- **Node.js 20.19 ou superior** (recomendado 22) — confira com `node --version`
- Acesso ao **projeto Supabase de desenvolvimento** (peça o convite a quem criou o projeto)

> No Windows, use o **Git Bash** para todos os comandos deste README.

---

## 2. Primeiro acesso ao projeto

```bash
git clone https://github.com/guilhermepinheiroo/Utilgas-Projeto-de-Desenvolvimento-01.git
cd Utilgas-Projeto-de-Desenvolvimento-01
git checkout main
git pull
```

Instale a Supabase CLI do projeto (fica em `package.json` da raiz, todos usam a mesma versão):

```bash
npm install
```

Os comandos da CLI são sempre chamados com `npx supabase ...`.

---

## 3. Banco de dados (Supabase)

### 3.1 Conectar ao projeto dev

```bash
npx supabase login
npx supabase link --project-ref rkayynyrnstzhuvwjhdr
```

O segundo comando pede a **senha do banco** (pergunte a quem criou o projeto). Faça isso uma vez, na sua máquina.

### 3.2 Regras das migrations

- Toda mudança de estrutura (tabela, coluna, índice) vira uma **migration** em `supabase/migrations/`.
- **Nunca altere tabelas pelo painel do Supabase.** O banco precisa continuar igual ao repositório.
- **Nunca edite uma migration que já foi aplicada.** Para corrigir algo, crie outra.
- Migrations entram por Pull Request com aprovação do responsável pelo banco.

Criar uma migration nova:

```bash
npx supabase migration new nome_da_mudanca
```

Edite o arquivo gerado em `supabase/migrations/` e aplique no banco dev:

```bash
npx supabase db push
```

Depois de puxar código novo da `main`, rode `npx supabase db push` para ficar em dia com as migrations dos colegas.

> A migration inicial (`criar_tabelas_base`) **já foi aplicada** no projeto dev. Você não precisa rodá-la de novo.

### 3.3 Dados de exemplo (seed) — só em desenvolvimento

O arquivo `supabase/seed.sql` cria regiões, produtos e entregadores de exemplo.

1. No painel do Supabase (projeto **dev**), abra **SQL Editor → New query**.
2. Cole o conteúdo de `supabase/seed.sql` e clique em **Run**.

Rode **uma vez só** (rodar de novo duplica produtos e entregadores). **Nunca em produção.**

### 3.4 Criar seu usuário de login

1. No painel: **Authentication → Users → Add user**, com e-mail e senha (marque *Auto Confirm User*).
2. Copie o **UID** do usuário criado e rode no **SQL Editor**:

```sql
insert into public.perfis (id, nome, papel)
values ('COLE_O_UID_AQUI', 'Seu Nome', 'admin');
```

Sem a linha em `perfis`, o login funciona mas a API responde 403.

---

## 4. Rodando o back-end

```bash
cd backend
python -m venv .venv
```

Ative o ambiente virtual:

```bash

source .venv/Scripts/activate

O terminal deve mostrar `(.venv)` no início da linha. Depois:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Abra o arquivo `backend/.env` e preencha:

```
SUPABASE_URL=https://rkayynyrnstzhuvwjhdr.supabase.co
SUPABASE_SERVICE_KEY=cole_a_service_role_key_aqui
CORS_ORIGINS=http://localhost:5173
```

A `service_role key` está no painel do Supabase em **Project Settings → API Keys**.

> **A `service_role key` é secreta: dá acesso total ao banco.** Nunca a envie em chats, nunca a coloque no front-end e nunca faça commit do `.env`.

Suba o servidor:

```bash
python -m uvicorn app.main:app --reload
```

| O quê | Endereço |
|---|---|
| Documentação interativa (Swagger) — **é o contrato da API** | http://localhost:8000/docs |
| Teste de vida | http://localhost:8000/health → `{"status":"ok"}` |

Testes e lint (com o ambiente virtual ativo, dentro de `backend/`):

```bash
pytest
ruff check .
```

### Como implementar uma rota

As rotas já existem no contrato, mas devolvem **501** até serem implementadas.

1. Abra o `router.py` do módulo e troque `raise nao_implementado()` pela lógica.
2. Leia a docstring da rota: ela descreve a regra de negócio esperada.
3. Acesse o banco com `db: Client = Depends(get_db)` (de `app/core/auth.py`).
4. Escreva um teste em `backend/tests/`.

### Regras da API

- Todas as rotas, exceto `/health`, exigem o header `Authorization: Bearer <token do Supabase Auth>`.
- **Preço do produto e taxa de entrega são calculados no servidor**, nunca enviados pelo front-end.
- `POST /vendas` roda tudo na **mesma transação**: venda, itens, baixa de estoque e criação da entrega.
- Telefone é guardado **somente com dígitos** (ex.: `5398812447`).
- Mudou o formato de uma rota? **Avise o front-end** antes de mesclar.

---

## 5. Rodando o front-end

```bash
cd Frontend
npm install
npm run dev
```

O site abre em http://localhost:5173.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Verifica os tipos (TypeScript) e gera o build de produção |
| `npm run lint` | Roda o ESLint |
| `npm run preview` | Serve o build gerado |

### Variáveis de ambiente do front-end

Quando a integração com a API começar, crie o arquivo `Frontend/.env` (ele **não** vai para o Git):

```
VITE_API_URL=http://localhost:8000
```

Para o login via Supabase Auth, use também `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave **anon / publishable**). **Nunca** use a `service_role key` no front-end.

### Rodando tudo junto

Abra dois terminais:

```bash
# Terminal 1 — API
cd backend && source .venv/Scripts/activate && python -m uvicorn app.main:app --reload

# Terminal 2 — Front-end
cd Frontend && npm run dev
```

---

## 6. Fluxo de trabalho com Git

1. **Nunca faça push direto na `main`.** Toda mudança entra por Pull Request.
2. Antes de começar, atualize a `main` e crie sua branch a partir dela:

```bash
git checkout main
git pull
git checkout -b feature/nome-da-tarefa
```

3. Padrão de nomes: `feature/clientes-crud`, `feature/tela-entregas`, `fix/erro-no-login`.
4. Commits pequenos e com mensagem clara (`feat: ...`, `fix: ...`, `docs: ...`).
5. **Antes de todo commit**, rode `git status` e confirme que **não** aparecem `.env`, `.venv/` nem `node_modules/`.
6. Envie e abra o Pull Request no GitHub:

```bash
git push -u origin feature/nome-da-tarefa
```

7. Peça revisão de alguém do time. Depois do merge, volte à `main` e rode `git pull`.

> **Dica:** para levar mudanças não commitadas de uma branch para outra, `git checkout OUTRA_BRANCH` já leva os arquivos junto. Evite `git stash` e `git reset --hard` se não tiver certeza do que estão fazendo.

---

## 7. Estrutura e responsabilidades

```
.
├── Frontend/                React + TypeScript + Tailwind
├── backend/
│   ├── app/
│   │   ├── core/            configuração, autenticação (JWT do Supabase), erros
│   │   ├── clientes/        router.py + schemas.py
│   │   ├── vendas/          router.py + schemas.py
│   │   ├── produtos/        produtos e /estoque
│   │   ├── entregas/        entregas, entregadores e regiões
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── supabase/
│   ├── migrations/          versão do banco (histórico de mudanças)
│   ├── seed.sql             dados de exemplo (só dev)
│   └── config.toml
├── package.json             Supabase CLI
└── README.md
```

### Módulos da API

| Módulo | Rotas principais | Responsável |
|---|---|---|
| Clientes | `/clientes`, `/clientes/por-telefone/{tel}`, endereços | Back-end 1 |
| Vendas | `POST /vendas`, `GET /vendas` | Back-end 1 |
| Produtos e Estoque | `/produtos`, `/estoque/*` | Back-end 2 |
| Entregas | `/entregas`, `/entregadores`, `/regioes` | Back-end 2 |
| Auth | `/me` (perfil do usuário logado) | Full-stack |

### Telas do front-end

| Tela | Modo na entrega | Responsável |
|---|---|---|
| Atendimento (busca por telefone + venda em 4 etapas) | Funcional | Full-stack |
| Portaria | Funcional | Full-stack |
| Clientes | Funcional | Front-end |
| Entregas | Funcional | Front-end |
| Vendas (histórico) | Apenas visual (mockup) | Front-end |
| Estoque | Apenas visual (mockup) | Front-end |
| Dashboard | Apenas visual (mockup) | Front-end |

### Banco de dados

Tabelas: `perfis`, `regioes`, `clientes`, `enderecos`, `produtos`, `vendas`, `itens_venda`, `movimentacoes_estoque`, `entregadores`, `entregas`. O RLS está ligado em todas, sem policies: o acesso é feito somente pela API (service role).

---

## 8. Escopo da entrega (04/11/2026)

- **Banco de dados:** completo, com migrations versionadas.
- **Back-end:** API completa, **exceto o módulo de Dashboard**.
- **Front-end:** todas as telas funcionais e integradas à API, **exceto** Estoque, Vendas (histórico) e Dashboard, que serão **apenas visuais** com dados fictícios (mockups).

---

## 9. Problemas comuns

**`bash: .venv/bin/activate: No such file or directory`** (Windows)
No Windows o caminho é `source .venv/Scripts/activate`.

**`uvicorn: command not found`**
Use `python -m uvicorn app.main:app --reload` com o ambiente virtual ativo (`(.venv)` no terminal).

**A API devolve 401 ou 403**
401: token ausente ou expirado. 403: seu usuário não tem linha em `perfis` (veja o passo 3.4) ou está inativo.

**A API devolve 501**
Esperado: a rota existe no contrato mas ainda não foi implementada.

**Erro de variável de ambiente ao subir o back-end**
O `backend/.env` está vazio ou incompleto. Reveja o passo 4.

**`relation "public.xxx" does not exist`**
Seu terminal está apontando para outro projeto Supabase ou faltam migrations: rode `npx supabase db push`.

**O `npm install` do front-end falha**
Confira a versão do Node (`node --version`, precisa ser 20.19 ou superior).

**Apareceu `.env` no `git status`**
Não faça commit. Avise o time e confira se o `.gitignore` está atualizado.
