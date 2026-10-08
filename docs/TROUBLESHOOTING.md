# Resolução de Problemas

## Iniciação do Servidor

### Erro: `Failed to start tunnel ... 404 Not Found`

**Sintoma:**
```
Failed to start tunnel ... 404 Not Found
```

**Causa:**  
O túnel público da Smithery foi desativado. Isso é esperado.

**Solução:**  
Ignore a mensagem. O script `npm run dev` já inclui `--no-tunnel`. O servidor funciona normalmente em `http://127.0.0.1:8081`.

---

### Erro: `EADDRINUSE: address already in use`

**Sintoma:**
```
Error: listen EADDRINUSE: address already in use :::8081
```

**Causa:**  
Já existe outro processo usando a porta 8081.

**Solução:**

**Opção 1:** Usar outra porta
```bash
npm run dev -- --port 3000
```

**Opção 2:** Matar o processo antigo
```bash
# Windows PowerShell
Get-Process -Name node | Stop-Process -Force

# Bash/Git Bash
pkill -f "node"

# macOS
killall node
```

Depois, inicie novamente:
```bash
npm run dev
```

---

### Erro: `The specified runtime version is not installed`

**Sintoma:**
```
The specified runtime version is not installed
```

**Causa:**  
Node.js versão 22.19+ não está instalado.

**Solução:**

1. Verifique a versão atual:
   ```bash
   node -v
   ```

2. Atualize Node para 22.19 ou superior:
   - **nvm (macOS/Linux):**
     ```bash
     nvm install 22
     nvm use 22
     ```
   
   - **fnm (Windows/macOS/Linux):**
     ```bash
     fnm install 22
     fnm use 22
     ```
   
   - **Direto:** Baixe em [nodejs.org](https://nodejs.org)

3. Verifique novamente:
   ```bash
   node -v  # deve mostrar v22.19.0 ou maior
   ```

---

## MCP Inspector

### Erro: `PORT IS IN USE at http://127.0.0.1:6274`

**Sintoma:**
```
MCP Inspector PORT IS IN USE at http://127.0.0.1:6274
```

**Causa:**  
Já existe uma instância do Inspector aberta.

**Solução:**

**Opção 1:** Usar a abinha já aberta
```bash
# Abra o navegador na URL mostrada no terminal anterior
```

**Opção 2:** Usar uma porta diferente (Bash)
```bash
CLIENT_PORT=6284 npx @modelcontextprotocol/inspector --transport http --server-url http://127.0.0.1:8081/mcp
```

**Opção 3:** Usar uma porta diferente (PowerShell)
```powershell
$env:CLIENT_PORT=6284
npx @modelcontextprotocol/inspector --transport http --server-url http://127.0.0.1:8081/mcp
```

**Opção 4:** Matar o processo antigo
```bash
# Windows PowerShell
Get-Process -Name node | Stop-Process -Force

# Bash
pkill -f "inspector"
```

---

### Erro: Inspector não conecta ao servidor

**Sintoma:**
```
Connection refused / Failed to connect
```

**Causa:**  
Servidor MCP não está rodando ou a URL está incorreta.

**Debug Steps:**

1. **Confirme que o servidor está rodando:**
   ```bash
   npm run dev
   ```
   Deve mostrar:
   ```
   info Ready on http://127.0.0.1:8081
   ```

2. **Teste com curl:**
   ```bash
   curl -X POST http://127.0.0.1:8081/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```
   Deve retornar um JSON com a ferramenta `busca_cep`.

3. **Confirme a URL no Inspector:**
   - URL deve ser: `http://127.0.0.1:8081/mcp` (com `/mcp` no final)
   - Não use `http://127.0.0.1:8081` (sem `/mcp`)

4. **Tente reconectar:**
   No Inspector web, clique em "Refresh" ou reconecte manualmente.

---

## Chamadas de Ferramenta

### Erro: `Expected string, received number at cep`

**Sintoma:**
```
Expected string, received number at cep
```

**Causa:**  
O CLI do MCP Inspector interpretou o CEP como número (sem hífen).

**Solução:**  
Use o CEP **com hífen**:

```bash
# ❌ Errado (sem hífen)
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp \
  --method tools/call \
  --tool-name busca_cep \
  --tool-arg cep=20040020

# ✅ Certo (com hífen)
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp \
  --method tools/call \
  --tool-name busca_cep \
  --tool-arg cep=20040-020
```

---

### Erro: `CEP inválido. Envie um CEP com 8 dígitos numéricos.`

**Sintoma:**
```
CEP inválido. Envie um CEP com 8 dígitos numéricos.
```

**Causa:**  
O CEP fornecido não tem 8 dígitos ou contém caracteres inválidos.

**Exemplos inválidos:**
- `1234567` (7 dígitos)
- `123456789` (9 dígitos)
- `1234-56` (hífen no lugar errado)
- `12345-abc` (caracteres não-numéricos)
- `` (vazio)

**Solução:**  
Forneça um CEP com 8 dígitos numéricos:
- Com hífen: `06755-260`
- Sem hífen: `06755260`

---

### Erro: `Erro ao buscar endereço. Envie novamente por favor!`

**Sintoma:**
```
Erro ao buscar endereço. Envie novamente por favor!
```

**Causa:**  
O CEP é válido em formato, mas não existe no banco de dados do ViaCEP.

**Solução:**

1. **Valide o CEP:**
   - Consulte [buscacep.com.br](https://buscacep.com.br) para verificar se o CEP existe
   - Alguns CEPs são reservados ou ainda não foram cadastrados

2. **Teste com um CEP conhecido:**
   ```bash
   npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp \
     --method tools/call \
     --tool-name busca_cep \
     --tool-arg cep=01310-100  # Avenida Paulista, SP
   ```

3. **Se o problema persistir:**
   - O ViaCEP pode estar temporariamente indisponível
   - Aguarde alguns minutos e tente novamente

---

## Integração com Claude Desktop

### Ferramenta não aparece no Claude Desktop

**Sintoma:**
```
Comando busca_cep não disponível
```

**Causa:**  
Configuração incorreta em `~/.claude/mcp.json` ou servidor não está rodando.

**Debug Steps:**

1. **Confirme que o servidor está rodando:**
   ```bash
   npm run dev
   ```

2. **Verifique o arquivo `~/.claude/mcp.json`:**
   - Caminho no Windows: `C:\Users\[seu-usuario]\.claude\mcp.json`
   - Caminho no macOS/Linux: `~/.claude/mcp.json`
   
   Conteúdo esperado:
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

3. **Valide o JSON:**
   - Use [jsonlint.com](https://www.jsonlint.com) para verificar sintaxe
   - Procure por aspas ou vírgulas faltantes

4. **Reinicie Claude Desktop:**
   - Feche completamente
   - Reabra

5. **Teste com MCP Inspector:**
   ```bash
   npx @modelcontextprotocol/inspector --transport http --server-url http://127.0.0.1:8081/mcp
   ```
   Se funcionar aqui, o problema é com Claude Desktop.

---

## ViaCEP

### Servidor ViaCEP está indisponível

**Sintoma:**
```
Erro ao buscar endereço (todos os CEPs falham)
```

**Causa:**  
ViaCEP pode estar temporariamente offline.

**Debug:**

1. Teste o ViaCEP diretamente:
   ```bash
   curl https://viacep.com.br/ws/06755260/json/
   ```

2. Esperado: Resposta JSON com os dados do endereço

3. Se falhar: ViaCEP está offline. Aguarde e tente novamente.

---

## Logs e Debugging

### Ver logs detalhados

O servidor não gera logs detalhados por padrão. Para adicionar debugging:

```bash
# No terminal do servidor (npm run dev):
# Logs aparecem conforme requisições chegam
```

### Habilitar debug no CLI do Inspector

```bash
# Bash
DEBUG=* npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp --method tools/list

# PowerShell
$env:DEBUG="*"
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp --method tools/list
```

---

## Não Encontrou Seu Problema?

Se o problema não está listado:

1. **Verifique o README:**
   - [README.md](../README.md)

2. **Verifique a arquitetura:**
   - [ARCHITECTURE.md](../ARCHITECTURE.md)

3. **Consulte a referência da API:**
   - [API.md](./API.md)

4. **Crie uma issue:**
   - [github.com/michaeldouglas/mcp_cep_service/issues](https://github.com/michaeldouglas/mcp_cep_service/issues)

---

## Próximos Passos

- Configuração? Veja [SETUP.md](./SETUP.md)
- Referência da API? Consulte [API.md](./API.md)
- Deploy? Leia [DEPLOYMENT.md](./DEPLOYMENT.md)
