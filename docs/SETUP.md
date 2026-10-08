# Configuração

## Pré-requisitos

- **Node.js:** 22.19 ou superior (recomendado: LTS 24)
- **npm:** 10 ou superior
- **Acesso a ViaCEP:** Conexão HTTP outbound para `viacep.com.br`

Verifique suas versões:

```bash
node -v
npm -v
```

## Instalação

### 1. Clonar o Repositório

```bash
git clone https://github.com/michaeldouglas/mcp_cep_service.git
cd mcp_cep_service
```

### 2. Instalar Dependências

```bash
npm install
```

Isso instala:
- `@modelcontextprotocol/sdk` — SDK do Model Context Protocol
- `zod` — Validação de schemas
- `@smithery/cli` — Build e dev server

## Inicialização

### Modo Desenvolvimento

```bash
npm run dev
```

**Saída esperada:**
```
✓ Initial build complete
> Starting local development server...
info Ready on http://127.0.0.1:8081
> Server starting on port 8081
```

O servidor está pronto em `http://127.0.0.1:8081/mcp`.

**Opções úteis:**

```bash
# Não abrir navegador automaticamente
npm run dev -- --no-open

# Usar uma porta diferente
npm run dev -- --port 3000
# Endpoint vira: http://127.0.0.1:3000/mcp

# Combinar opções
npm run dev -- --no-open --port 8082
```

### Modo Produção

1. Gerar o build:
   ```bash
   npm run build
   ```

2. O bundle é gerado em `.smithery/shttp` (ignorado pelo git)

3. Para deploy, consulte [DEPLOYMENT.md](./DEPLOYMENT.md)

## Configuração de Porta

A porta padrão é **8081**. Para mudar:

```bash
# Desenvolvimento
npm run dev -- --port 3000

# O servidor estará em: http://127.0.0.1:3000/mcp
```

> **Nota:** Registre a URL correta em clientes MCP (Claude Desktop, etc.)

## Variáveis de Ambiente

Atualmente, o servidor não usa variáveis de ambiente. Se precisar adicionar:

1. Edite `src/index.ts`
2. Leia com `process.env.VARIAVEL`
3. Documente em `CONTRIBUTING.md`

**Exemplo (se necessário):**

```typescript
const viacepUrl = process.env.VIACEP_URL || 'https://viacep.com.br/ws';
```

## Integração com Claude Desktop

### 1. Configurar MCP Server

Edite `~/.claude/mcp.json` (crie o arquivo se não existir):

```json
{
  "mcpServers": {
    "cep-service": {
      "command": "http",
      "args": ["http://127.0.0.1:8081/mcp"]
    }
  }
}
```

### 2. Reiniciar Claude Desktop

Feche e reabra Claude Desktop. A ferramenta `busca_cep` estará disponível.

### 3. Testar

No Claude Desktop:
```
Qual é a cidade do CEP 06755-260?
```

Claude chamará a ferramenta e responderá com a informação.

## Testes Locais

### com MCP Inspector (Web UI)

```bash
# Terminal 1: Inicie o servidor
npm run dev

# Terminal 2: Inicie o Inspector
npx @modelcontextprotocol/inspector --transport http --server-url http://127.0.0.1:8081/mcp
```

Abra a URL mostrada no navegador, vá em **Tools**, execute `busca_cep`.

### com MCP Inspector (CLI)

```bash
# Listar ferramentas
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp --method tools/list

# Chamar ferramenta
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp \
  --method tools/call \
  --tool-name busca_cep \
  --tool-arg cep=06755-260
```

### com curl (requisição HTTP bruta)

```bash
curl -X POST http://127.0.0.1:8081/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "busca_cep",
      "arguments": {
        "cep": "06755-260"
      }
    }
  }'
```

## Resolução de Problemas

**Erro ao iniciar:**
```
Failed to start tunnel ... 404 Not Found
```
→ Isso é esperado. O script `dev` já inclui `--no-tunnel`. Ignore.

**Porta em uso:**
```
EADDRINUSE: address already in use :::8081
```
→ Use outra porta: `npm run dev -- --port 3000`

**Node version incorreta:**
```
The specified runtime version is not installed
```
→ Atualize Node: `node -v` e instale versão 22.19+

Para mais soluções, consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Próximos Passos

- Testar a API? Veja [API.md](./API.md)
- Entender a arquitetura? Consulte [ARCHITECTURE.md](../ARCHITECTURE.md)
- Deploy em produção? Leia [DEPLOYMENT.md](./DEPLOYMENT.md)
