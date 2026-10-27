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

Pode rodar mais de uma vez: ele não duplica o que já existe. **Nunca em produção.**

### 3.4 Criar seu usuário de login

Cada usuário precisa de login no Supabase Auth e de uma linha em `perfis`. O script abaixo faz os dois (precisa do `backend/.env` do passo 4):

```bash
cd backend
source .venv/Scripts/activate
python -m scripts.criar_usuario --email voce@exemplo.com --nome "Seu Nome" --papel admin
```

A senha é pedida no terminal. Para quem só atende, use `--papel operador`.

Ou pelo painel:

1. **Authentication → Users → Add user**, com e-mail e senha (marque *Auto Confirm User*).
2. Copie o **UID** do usuário e rode no **SQL Editor**:

```sql
insert into public.perfis (id, nome, papel)
values ('COLE_O_UID_AQUI', 'Seu Nome', 'admin');
```

Sem a linha em `perfis` o login não entra ("Usuário sem perfil ativo").

---

## 4. Rodando o back-end

```bash
cd backend
python -m venv .venv
```

Ative o ambiente virtual:

```bash
source .venv/Scripts/activate
```

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

Testes das funções SQL (precisam de um Supabase **local**, nunca do dev/prod):

```bash
npx supabase start          # na raiz; precisa do Docker
npx supabase db reset
pip install "psycopg[binary]" pytest
export TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
pytest tests_sql -v         # dentro de backend/
```

Sem `TEST_DATABASE_URL` esses testes são ignorados.

### Como criar ou alterar uma rota

1. Abra o `router.py` do módulo. A docstring de cada rota descreve a regra de negócio.
2. Acesse o banco com `db: Client = Depends(get_db)` (de `app/core/auth.py`).
3. Escreva um teste em `backend/tests/` (veja o `FakeDB` em `test_clientes_vendas.py`).
4. Se mudar o formato da resposta, ajuste o serviço correspondente em `Frontend/src/services/`.

### Regras da API

- Login pela API: `POST /auth/login` (e `POST /auth/refresh` para renovar o token).
- Todas as rotas, exceto `/health` e `/auth/*`, exigem o header `Authorization: Bearer <access_token>`.
- **Preço do produto e taxa de entrega são calculados no servidor**, nunca enviados pelo front-end.
- `POST /vendas` roda tudo na **mesma transação**: venda, itens, baixa de estoque e criação da entrega.
- **Estoque de botijões (cheio e vazio):** toda venda de produto com `controla_vazio` (gás) baixa 1 unidade **cheia** e soma 1 **vazia**; cancelar a venda desfaz. Quem faz isso é o banco, pelas funções SQL `registrar_venda`, `cancelar_venda` e `movimentar_estoque` (chame com `chamar_rpc` de `app/core/db_errors.py`, que converte os erros em 404/409/422). Nunca altere `estoque_atual`/`estoque_vazio` direto pela API.
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

Copie `Frontend/.env.example` para `Frontend/.env` (ele **não** vai para o Git):

```
VITE_API_URL=http://localhost:8000
```

O front fala só com a API, então não precisa de chave do Supabase. **Nunca** coloque a `service_role key` no front-end.

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
│   │   ├── auth/            login e renovação de sessão (Supabase Auth)
│   │   ├── core/            configuração, autenticação, datas, frequência de compra
│   │   ├── clientes/        router.py + schemas.py
│   │   ├── vendas/          router.py + schemas.py
│   │   ├── produtos/        produtos e /estoque
│   │   ├── entregas/        entregas, entregadores e regiões
│   │   ├── dashboard/       indicadores e gráficos (somente leitura)
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
| Dashboard | `/dashboard/*` (somente leitura) | Back-end 2 |
| Auth | `/auth/login`, `/auth/refresh`, `/me` | Full-stack |

### Telas do front-end

| Tela | Modo na entrega | Responsável |
|---|---|---|
| Login | Funcional | Full-stack |
| Atendimento (busca por telefone + venda em 4 etapas) | Funcional | Full-stack |
| Portaria | Funcional | Full-stack |
| Clientes | Funcional | Front-end |
| Entregas | Funcional | Front-end |
| Vendas (histórico) | Funcional | Front-end |
| Estoque | Funcional | Front-end |
| Dashboard | Funcional | Front-end |

A conversão entre o formato da API e o do front fica em `Frontend/src/services/`.

### Banco de dados

Tabelas: `perfis`, `regioes`, `clientes`, `enderecos`, `produtos`, `vendas`, `itens_venda`, `movimentacoes_estoque`, `entregadores`, `entregas`. O RLS está ligado em todas, sem policies: o acesso é feito somente pela API (service role).

---

## 8. Escopo da entrega (04/11/2026)

- **Banco de dados:** completo, com migrations versionadas.
- **Back-end:** API completa (inclui login e Dashboard).
- **Front-end:** todas as telas integradas à API.

---

## 9. Problemas comuns

**`bash: .venv/bin/activate: No such file or directory`** (Windows)
No Windows o caminho é `source .venv/Scripts/activate`.

**`uvicorn: command not found`**
Use `python -m uvicorn app.main:app --reload` com o ambiente virtual ativo (`(.venv)` no terminal).

**Login: "Usuário sem perfil ativo"**
Falta a linha em `perfis` (passo 3.4) ou ela está com `ativo = false`.

**"Não foi possível conectar ao servidor"**
A API não está rodando ou o `VITE_API_URL` está errado (reinicie o `npm run dev` depois de mudar o `.env`).

**Erro de CORS**
Confira o `CORS_ORIGINS` no `backend/.env`.

**Erro de variável de ambiente ao subir o back-end**
O `backend/.env` está vazio ou incompleto. Reveja o passo 4.

**`relation "public.xxx" does not exist`**
Seu terminal está apontando para outro projeto Supabase ou faltam migrations: rode `npx supabase db push`.

**O `npm install` do front-end falha**
Confira a versão do Node (`node --version`, precisa ser 20.19 ou superior).

**Apareceu `.env` no `git status`**
Não faça commit. Avise o time e confira se o `.gitignore` está atualizado.
