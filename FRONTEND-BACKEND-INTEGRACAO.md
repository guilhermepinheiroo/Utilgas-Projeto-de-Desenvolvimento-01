# Integração do Frontend com o Backend

Este documento descreve o contrato esperado pelo frontend do UtilGás para a integração com o backend.

## 1. Visão geral

- Frontend: React + TypeScript + Vite.
- URL base da API: variável `VITE_API_URL`.
- Valor atual de desenvolvimento: `http://localhost:3000`.
- Cliente HTTP centralizado em `Frontend/src/services/Api.ts`.
- Formato de comunicação: JSON.
- Datas: strings ISO.
- Valores monetários: inteiros em centavos.
- IDs: strings.

### Configuração local

Criar ou ajustar `Frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Após alterar `.env`, reiniciar o servidor Vite.

## 2. Requisitos gerais do backend

### CORS

Durante o desenvolvimento, permitir a origem do Vite:

```text
http://localhost:5173
```

Em produção, permitir somente o domínio oficial do frontend.

Métodos usados:

```text
GET
POST
PATCH
DELETE
```

Headers enviados quando existe corpo:

```http
Content-Type: application/json
```

### Respostas de erro

O frontend procura uma mensagem string nestes campos:

```json
{
  "mensagem": "Descrição legível do erro"
}
```

ou:

```json
{
  "message": "Descrição legível do erro"
}
```

Quando a API retornar status HTTP diferente de `2xx`, o frontend exibe a mensagem recebida.

Status recomendados:

| Status | Uso |
|---|---|
| `400` | Dados inválidos |
| `401` | Não autenticado |
| `403` | Sem permissão |
| `404` | Registro não encontrado |
| `409` | Conflito, por exemplo produto já existente |
| `422` | Validação de campos |
| `500` | Erro interno |

## 3. Contratos já preparados no frontend

## 3.1 Entregas

Arquivo relacionado:

`Frontend/src/services/Entregas.ts`

### Listar entregas

```http
GET /entregas
```

Query parameters:

| Parâmetro | Tipo | Obrigatório | Observação |
|---|---|---:|---|
| `data` | `YYYY-MM-DD` | Sim | Data da listagem |
| `busca` | string | Sim | Busca por cliente, endereço ou pedido |
| `entregadorId` | string | Não | Não é enviado quando o filtro é `todos` |
| `status` | string | Não | `pendente`, `entregue` ou `cancelada` |
| `pagina` | number | Sim | Começa em `1` |
| `tamanhoPagina` | number | Sim | Atualmente `10` |

Exemplo:

```http
GET /entregas?data=2026-10-26&busca=&pagina=1&tamanhoPagina=10
```

Resposta esperada:

```json
{
  "itens": [
    {
      "id": "entrega-123",
      "numeroPedido": 123,
      "status": "pendente",
      "cliente": {
        "id": "cliente-1",
        "nome": "Ana Paula Silva",
        "whatsapp": "53988124477",
        "endereco": "Rua das Flores, 100",
        "bairro": "Centro"
      },
      "entregador": {
        "id": "entregador-1",
        "nome": "Carlos Entregador"
      },
      "itens": [
        {
          "produtoId": "botijaoP13",
          "quantidade": 1
        }
      ],
      "horarioPrevisto": "2026-10-26T16:30:00",
      "totalCentavos": 13000
    }
  ],
  "total": 1
}
```

`total` deve ser o total de registros encontrados antes da paginação.

### Resumo das entregas

```http
GET /entregas/resumo?data=2026-10-26
```

Resposta:

```json
{
  "total": 20,
  "variacaoPercentual": 8.5,
  "pendentes": 6,
  "concluidas": 14
}
```

As entregas canceladas não devem entrar em `total` nem em `concluidas`.

### Listar entregadores

```http
GET /entregadores
```

Resposta:

```json
[
  {
    "id": "entregador-1",
    "nome": "Carlos Entregador"
  }
]
```

### Trocar entregador

```http
PATCH /entregas/{id}/entregador
Content-Type: application/json
```

Body:

```json
{
  "entregadorId": "entregador-2"
}
```

Resposta recomendada: `204 No Content` ou o objeto `Entrega` atualizado.

### Finalizar entrega

```http
POST /entregas/{id}/finalizar
```

Regras:

- Só permitir finalizar entrega `pendente`.
- Registrar data/hora de conclusão.
- Atualizar o status para `entregue`.
- Atualizar estoque, caso a regra de negócio exija baixa no momento da entrega.

Resposta recomendada: `204 No Content` ou a entrega atualizada.

### Cancelar entrega

```http
POST /entregas/{id}/cancelar
Content-Type: application/json
```

Body opcional:

```json
{
  "motivo": "Cliente ausente"
}
```

Regras:

- Só permitir cancelar entrega `pendente`.
- Atualizar o status para `cancelada`.
- Preservar o histórico.
- Registrar o motivo quando enviado.

## 3.2 Estoque

Arquivos relacionados:

- `Frontend/src/services/EstoqueGestao.ts`
- `Frontend/src/types/EstoqueGestao.ts`

### Listar produtos

```http
GET /estoque/produtos
```

Query parameters opcionais:

| Parâmetro | Tipo |
|---|---|
| `busca` | string |
| `categoria` | `gas`, `agua` ou `outros` |

Resposta:

```json
[
  {
    "id": "produto-1",
    "nome": "P13 - Botijão de gás 13kg",
    "categoria": "gas",
    "quantidade": 8,
    "precoCentavos": 11200,
    "estoqueMinimo": 20
  }
]
```

Categorias aceitas:

```text
gas
agua
outros
```

Status exibidos pelo frontend:

| Condição | Status visual |
|---|---|
| quantidade igual a zero ou até metade do mínimo | Crítico |
| quantidade menor ou igual ao mínimo | Baixo |
| quantidade acima do mínimo | Normal |

### Resumo do estoque

```http
GET /estoque/resumo
```

Resposta:

```json
{
  "total": 1284,
  "entradasMes": 412,
  "saidasMes": 389,
  "baixoEstoque": 2
}
```

### Listar movimentações

```http
GET /estoque/movimentacoes
```

Resposta:

```json
[
  {
    "id": "mov-1",
    "produtoId": "produto-1",
    "produtoNome": "P13 - Botijão de gás 13kg",
    "tipo": "entrada",
    "quantidade": 10,
    "dataHora": "2026-10-26T14:30:00"
  }
]
```

Tipos:

```text
entrada
saida
```

### Criar produto

```http
POST /estoque/produtos
Content-Type: application/json
```

Body:

```json
{
  "nome": "P13 - Botijão de gás 13kg",
  "categoria": "gas",
  "precoCentavos": 11200,
  "estoqueInicial": 10,
  "estoqueMinimo": 5
}
```

Resposta recomendada: `201 Created` com o produto criado.

### Editar produto

```http
PATCH /estoque/produtos/{id}
Content-Type: application/json
```

Body parcial permitido:

```json
{
  "nome": "P13 - Botijão de gás 13kg",
  "categoria": "gas",
  "precoCentavos": 11500,
  "estoqueInicial": 10,
  "estoqueMinimo": 5
}
```

Resposta recomendada: `200 OK` com o produto atualizado.

### Excluir produto

```http
DELETE /estoque/produtos/{id}
```

Resposta recomendada: `204 No Content`.

Regras recomendadas:

- Não excluir fisicamente produto que já possui vendas/movimentações.
- Nesse caso, desativar o produto ou retornar `409`.

### Registrar entrada ou saída

```http
POST /estoque/movimentacoes
Content-Type: application/json
```

Body:

```json
{
  "produtoId": "produto-1",
  "quantidade": 10,
  "tipo": "entrada"
}
```

ou:

```json
{
  "produtoId": "produto-1",
  "quantidade": 2,
  "tipo": "saida"
}
```

Regras:

- `quantidade` deve ser maior que zero.
- Não permitir saída maior que o saldo disponível.
- Registrar data/hora no servidor.
- Recalcular o saldo do produto de forma transacional.

### Registrar troca de vazio

```http
POST /estoque/trocas-vazio
Content-Type: application/json
```

Body:

```json
{
  "tipo": "gas",
  "quantidade": 2
}
```

ou:

```json
{
  "tipo": "agua",
  "quantidade": 3
}
```

Tipos aceitos:

```text
gas
agua
```

O frontend trata a troca como registro próprio. O backend deve definir a movimentação resultante e manter o histórico da operação.

## 4. Telas que ainda usam mock no frontend

Estas telas ainda não chamam a API:

| Tela | Arquivo/serviço atual | Situação |
|---|---|---|
| Clientes | `Frontend/src/services/Clientes.ts` | Mock local |
| Dashboard | `Frontend/src/services/Dashboard.ts` | Mock local |
| Vendas | `Frontend/src/services/Vendas.ts` | Mock local |
| Portaria | `Frontend/src/pages/Portaria.tsx` | Produtos/carrinho mockados |
| Estoque gráfico legado | `Frontend/src/services/estoque.ts` | Mock local |

A tela de Entregas e a tela de Estoque/Gestão são as únicas que já estão preparadas para usar HTTP.

## 5. Contratos recomendados para as telas ainda mockadas

## 5.1 Clientes

Sugestão de endpoints:

```http
GET    /clientes
GET    /clientes/resumo
POST   /clientes
PATCH  /clientes/{id}
DELETE /clientes/{id}
```

Query sugerida para listagem:

```text
pagina
tamanhoPagina
busca
status
```

Resposta de listagem:

```json
{
  "itens": [],
  "total": 0
}
```

Objeto esperado:

```json
{
  "id": "cliente-1",
  "nome": "Ana Paula Silva",
  "whatsapp": "53988124477",
  "endereco": "Rua das Flores, 100",
  "ultimaCompra": "2026-10-20",
  "status": "ativo",
  "cadastradoEm": "2026-01-10"
}
```

Status:

```text
ativo
inativo
inadimplente
```

## 5.2 Vendas

Sugestão de endpoints:

```http
GET  /vendas
GET  /vendas/resumo
POST /vendas
GET  /vendas/{id}
POST /vendas/{id}/cancelar
```

Filtros esperados:

```text
periodo
clienteId
pagamento
status
busca
ordenacao
pagina
tamanhoPagina
```

Resposta de listagem:

```json
{
  "itens": [],
  "total": 0
}
```

Objeto esperado:

```json
{
  "id": "venda-1",
  "cliente": {
    "id": "cliente-1",
    "nome": "Ana Paula Silva",
    "cpf": "95465394369"
  },
  "origem": "portaria",
  "itens": [
    {
      "produtoId": "botijaoP13",
      "quantidade": 1,
      "precoUnitarioCentavos": 13000
    }
  ],
  "dataHora": "2026-10-26T11:45:00",
  "pagamento": "pix",
  "status": "pago",
  "totalCentavos": 13000
}
```

Valores aceitos:

```text
pagamento: pix, dinheiro, debito, credito
status: pago, pendente, cancelado
origem: portaria, entrega
```

Resumo:

```json
{
  "totalCentavos": 37100,
  "quantidade": 8,
  "clientesAtendidos": 7,
  "ticketMedioCentavos": 4638
}
```

## 5.3 Portaria

A tela de Portaria atualmente funciona com catálogo, cliente, carrinho e finalização locais. Para conectá-la ao backend, recomenda-se:

```http
GET  /portaria/produtos
GET  /clientes?busca=...
POST /vendas
```

Payload recomendado para venda:

```json
{
  "clienteId": "cliente-1",
  "origem": "portaria",
  "pagamento": "pix",
  "itens": [
    {
      "produtoId": "produto-1",
      "quantidade": 1
    }
  ]
}
```

O preço deve ser validado pelo backend. O frontend não deve ser a fonte de verdade do valor da venda.

## 6. Regras de dados

### Valores monetários

Sempre enviar e receber em centavos:

```json
{
  "precoCentavos": 11200,
  "totalCentavos": 37100
}
```

Não enviar valores formatados como `"R$ 112,00"` para a API.

### Datas

Preferir ISO 8601:

```text
2026-10-26
2026-10-26T16:30:00
2026-10-26T16:30:00Z
```

O backend deve documentar se os horários são UTC ou horário local de São Paulo.

### Telefones e CPF

- `whatsapp`: somente dígitos.
- `cpf`: somente dígitos.
- A máscara deve ser aplicada apenas na interface.

### Paginação

As páginas começam em `1`.

Resposta padrão:

```json
{
  "itens": [],
  "total": 0
}
```

## 7. Autenticação

O cliente HTTP ainda não envia `Authorization`. Quando o login for implementado, o token deve ser incluído centralmente em `Frontend/src/services/Api.ts`, por exemplo:

```http
Authorization: Bearer <token>
```

Não é necessário alterar cada serviço individualmente.

## 8. Checklist para quem fará o backend

- [ ] Configurar CORS para o domínio do frontend.
- [ ] Definir `VITE_API_URL` no ambiente correspondente.
- [ ] Implementar os endpoints de Entregas.
- [ ] Implementar os endpoints de Estoque.
- [ ] Retornar mensagens de erro em `mensagem` ou `message`.
- [ ] Manter valores monetários em centavos.
- [ ] Manter datas em ISO 8601.
- [ ] Implementar paginação com `itens` e `total`.
- [ ] Validar estoque no servidor.
- [ ] Tornar movimentações transacionais.
- [ ] Impedir saída maior que o estoque disponível.
- [ ] Definir política para exclusão de produtos com histórico.
- [ ] Definir timezone dos campos de data/hora.
- [ ] Implementar autenticação quando o login estiver disponível.
- [ ] Substituir os serviços mockados de Clientes, Dashboard e Vendas quando os endpoints forem definidos.

## 9. Validação local

No frontend:

```powershell
npm --prefix Frontend install
npm --prefix Frontend run build
npm --prefix Frontend run lint
```

Iniciar o frontend:

```powershell
npm --prefix Frontend run dev
```

Com o backend em `http://localhost:3000`, a aplicação usará automaticamente essa URL se `VITE_API_URL` não for alterada.
