# Um Cliente MCP Alimentado por LLM escrito em TypeScript

Um cliente chatbot MCP interativo: ele inicia um servidor MCP via stdio, lista suas ferramentas e as entrega ao Claude, que pode chamá-las enquanto responde suas perguntas.

Este exemplo acompanha o tutorial [Construir um cliente MCP](https://modelcontextprotocol.io/docs/develop/build-client).

## Pré-requisitos

- Node.js 24+
- npm
- Uma [chave da API Anthropic](https://console.anthropic.com/) (opcional — veja abaixo)

## Configuração

Instale as dependências e compile, depois configure seu arquivo `.env`:

```bash
npm install
npm run build
cp .env.example .env
# edite .env e configure ANTHROPIC_API_KEY e opcionalmente ANTHROPIC_WORKSPACE_ID
```

**Nota:** Se sua chave API não estiver scoped para um workspace, você deve adicionar `ANTHROPIC_WORKSPACE_ID` ao `.env`. Você pode encontrá-lo em https://console.anthropic.com/settings/workspace

## Execute o cliente

Você pode conectar a um servidor MCP via **caminho de arquivo** (stdio) ou **URL HTTP**:

### Via stdio (processo local)
```bash
node build/index.js ../weather-server-typescript/build/index.js
```

### Via HTTP/SSE (servidor remoto)
```bash
node build/index.js http://127.0.0.1:8081/mcp
```

(Compile o servidor primeiro — veja seu README.)

Digite uma pergunta (por exemplo, "Qual é o tempo em Sacramento?") e Claude responde usando as ferramentas do servidor. Digite `quit` para sair.

Sem uma `ANTHROPIC_API_KEY`, o cliente ainda se conecta, imprime as ferramentas do servidor e sai — útil para verificar a fiação MCP sem credenciais.

## Conteúdo estruturado

O SDK valida cada resultado contra o `outputSchema` declarado da ferramenta, portanto, as necessidades SHOULD do cliente não precisam de código aqui.

Os dois canais vão para leitores diferentes: `content` é encaminhado para o modelo, enquanto `structuredContent` é usado como dados — quando uma ferramenta retorna uma matriz, o cliente conta seus itens em vez de relê-los em prosa. Veja [Conteúdo Estruturado](https://modelcontextprotocol.io/specification/draft/server/tools#structured-content).

`versionNegotiation: { mode: 'auto' }` testa `server/discover` e volta para o handshake `2025-11-25`; o padrão do SDK é `'legacy'`. Veja a [documentação do SDK](https://ts.sdk.modelcontextprotocol.io/v2/).
