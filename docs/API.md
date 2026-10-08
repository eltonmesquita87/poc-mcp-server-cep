# Referência da API

## Visão Geral

O servidor MCP CEP Service expõe uma única ferramenta: `busca_cep`, que consulta a API do ViaCEP para obter endereços brasileiros.

**Endpoint:** `http://localhost:8081/mcp`  
**Transporte:** Streamable HTTP (JSON-RPC 2.0)  
**Autenticação:** Nenhuma

## Ferramenta: `busca_cep`

### Descrição

Busca um endereço completo a partir de um CEP válido, retornando logradouro, bairro, cidade e estado formatados para consumo por agentes de IA.

### Parâmetros

```typescript
{
  cep: string;  // 8 dígitos numéricos, com ou sem hífen
}
```

| Parâmetro | Tipo | Obrigatório | Formato | Exemplo |
|-----------|------|-------------|---------|---------|
| `cep` | string | ✓ Sim | 8 dígitos, com ou sem hífen | `"06755-260"` ou `"06755260"` |

### Resposta (Sucesso)

Status HTTP: **200 OK**

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"endereco\": \"Avenida José André de Moraes, Jardim Monte Alegre, Taboão da Serra - SP\", \"estado\": \"SP\"}"
    }
  ]
}
```

**Estrutura do resultado:**

```typescript
{
  endereco: string;   // Formato: "logradouro, bairro, cidade - UF"
  estado: string;     // Estado (UF) em 2 letras maiúsculas
}
```

### Resposta (Erro)

#### CEP inválido

**Código:** 200 (MCP sempre retorna 200, erros vêm no content)

```json
{
  "content": [
    {
      "type": "text",
      "text": "CEP inválido. Envie um CEP com 8 dígitos numéricos."
    }
  ]
}
```

**Causas:**
- CEP com menos de 8 dígitos
- CEP com caracteres não-numéricos (exceto hífen)
- CEP vazio ou nulo

**Exemplo de requisição inválida:**
```bash
# Falta dígito
curl -X POST http://127.0.0.1:8081/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"busca_cep","arguments":{"cep":"0675526"}}}'
```

#### CEP não encontrado

**Código:** 200 (MCP sempre retorna 200)

```json
{
  "content": [
    {
      "type": "text",
      "text": "Erro ao buscar endereço. Envie novamente por favor!"
    }
  ]
}
```

**Causas:**
- CEP não existe no banco de dados do ViaCEP
- CEP é válido em formato mas não foi cadastrado

**Nota:** O ViaCEP retorna `{"erro": true}` para CEPs inválidos. O servidor converte isso em mensagem amigável.

## Exemplos de Uso

### 1. CLI com MCP Inspector

```bash
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp \
  --method tools/call \
  --tool-name busca_cep \
  --tool-arg cep=06755-260
```

**Resposta:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"endereco\": \"Avenida José André de Moraes, Jardim Monte Alegre, Taboão da Serra - SP\", \"estado\": \"SP\"}"
    }
  ]
}
```

### 2. Web UI (MCP Inspector)

1. Inicie o Inspector: `npx @modelcontextprotocol/inspector --transport http --server-url http://127.0.0.1:8081/mcp`
2. Vá em **Tools** → selecione `busca_cep`
3. Preencha `cep: 20040-020`
4. Clique **Execute Tool**
5. Resultado aparece na seção de output

### 3. Integração com Claude Desktop

Configure em `~/.claude/mcp.json`:

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

Depois, no Claude Desktop:

```
Usuário: Qual é o bairro do CEP 06755-260?
Claude: [chama busca_cep com 06755-260]
Resposta: O bairro é Jardim Monte Alegre, localizado em Taboão da Serra, SP.
```

### 4. Requisição HTTP Raw (JSON-RPC)

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

## Codesde Erro Detalhados

| Mensagem | Causa Provável | Solução |
|----------|---|---|
| `CEP inválido. Envie um CEP com 8 dígitos numéricos.` | Formato incorreto | Verifique se tem 8 dígitos, remova caracteres especiais |
| `Erro ao buscar endereço. Envie novamente por favor!` | CEP não existe | Valide o CEP com ViaCEP diretamente ou consulte lista de CEPs válidos |
| `Expected string, received number at cep` | CLI interpretou como número | Use hífen: `--tool-arg cep=20040-020` |

## Limitações e Comportamento

- **Sem cache:** Cada requisição consulta ViaCEP diretamente
- **Sem autenticação:** Qualquer cliente pode chamar
- **Sem rate limiting integrado:** Use um reverse proxy (nginx, Cloudflare) se necessário
- **Resposta única:** Apenas um resultado por requisição (não há busca por múltiplos CEPs em uma chamada)

## Próximos Passos

- Entender a arquitetura? Veja [ARCHITECTURE.md](../ARCHITECTURE.md)
- Configurar para produção? Consulte [SETUP.md](./SETUP.md)
- Problemas? Veja [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
