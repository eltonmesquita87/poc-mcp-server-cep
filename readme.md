# Busca de Endereço por CEP

Um servidor **Model Context Protocol (MCP)** stateless que integra agentes de IA com a API pública do ViaCEP para buscar endereços brasileiros. Perfeito para Claude Desktop, aplicações MCP e agentes conversacionais que precisam validar ou preenchern endereços.

## Índice

- [Visão Geral](#visão-geral)
- [Início Rápido](#início-rápido)
- [Funcionalidades](#funcionalidades)
- [Teste com MCP Inspector](#teste-com-mcp-inspector)
- [Referência da API](#referência-da-api)
- [Problemas Comuns](#problemas-comuns)
- [Próximos Passos](#próximos-passos)

## Visão Geral

O **mcp_cep_service** é um servidor MCP que:
- Expõe uma ferramenta única: `busca_cep` para consultar endereços por CEP
- Valida entrada e retorna dados formatados, prontos para LLMs
- Executa sem estado, pronto para escalabilidade horizontal
- Integra-se a qualquer cliente MCP (Claude Desktop, aplicações, agentes)

**Tecnologia:** Node.js 22.19+ · TypeScript · Zod · @modelcontextprotocol/sdk

## Início Rápido

### 1. Clonar e instalar

```bash
git clone https://github.com/michaeldouglas/mcp_cep_service.git
cd mcp_cep_service
npm install
```

### 2. Iniciar o servidor

```bash
npm run dev
```

Quando pronto, o terminal mostra:
```
✓ Initial build complete
> Starting local development server...
info Ready on http://127.0.0.1:8081
```

### 3. Testar a ferramenta

Abra outro terminal e use o MCP Inspector:

```bash
npx @modelcontextprotocol/inspector --transport http --server-url http://127.0.0.1:8081/mcp
```

Pronto! O servidor está disponível em `http://127.0.0.1:8081/mcp`.

## Funcionalidades

- **Busca por CEP** — Consulta ViaCEP para obter endereço completo
- **Validação robusta** — Schemas Zod garantem integridade dos dados
- **Resposta formatada** — Retorna apenas os campos relevantes para IA
- **Stateless & escalável** — Sem estado entre requisições, replicável horizontalmente
- **Agnóstico a cliente** — Funciona com qualquer implementação do transporte MCP

## Referência da API

### Ferramenta: `busca_cep`

| Parâmetro | Tipo   | Descrição |
|-----------|--------|-----------|
| `cep`     | string | CEP com 8 dígitos, com ou sem hífen: `06755-260` ou `06755260` |

**Resposta (sucesso):**
```json
{
  "endereco": "Avenida José André de Moraes, Jardim Monte Alegre, Taboão da Serra - SP",
  "estado": "SP"
}
```

**Erros:**
- CEP inválido → `CEP inválido. Envie um CEP com 8 dígitos numéricos.`
- CEP não encontrado → `Erro ao buscar endereço. Envie novamente por favor!`

Para referência completa, consulte [docs/API.md](./docs/API.md).

## Teste com MCP Inspector

### Opção A: Interface Web

1. Com o servidor rodando (`npm run dev`), abra outro terminal:

   ```bash
   npx @modelcontextprotocol/inspector --transport http --server-url http://127.0.0.1:8081/mcp
   ```

2. Copie a URL mostrada no terminal e abra no navegador (abre automaticamente)
3. Confirme que o servidor está conectado (status deve estar verde)
4. Vá em **Tools** → selecione `busca_cep` → preencha `cep: 06755-260` → **Execute Tool**

### Opção B: Linha de Comando

Listar ferramentas:
```bash
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp --method tools/list
```

Chamar a ferramenta:
```bash
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8081/mcp --method tools/call --tool-name busca_cep --tool-arg cep=06755-260
```

> **Dica:** Use o CEP com hífen (`cep=06755-260`) para evitar ambiguidades no CLI.

## Problemas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| `Failed to start tunnel ... Not Found` | Túnel Smithery desativado | Use `npm run dev` (já sem túnel) |
| `PORT IS IN USE at 6274` | Inspector já aberto | Finalize ou use `CLIENT_PORT=6284` |
| `Expected string, received number at cep` | CLI interpretou CEP como número | Use CEP com hífen: `cep=20040-020` |
| Inspector não conecta | Servidor parado | Confirme `npm run dev` rodando |
| Node abaixo de 22.19 | Versão desatualizada | Atualize Node: `node -v` |

Para soluções detalhadas, consulte [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Próximos Passos

- **Entender a arquitetura?** Leia [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Configurar para produção?** Veja [docs/SETUP.md](./docs/SETUP.md)
- **Deploy (Docker, K8s)?** Consulte [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **Integrar com Claude Desktop?** Configure em `~/.claude/mcp.json`:

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

---

## Tecnologias e pré-requisitos

| Item                         | Versão                                      |
| ---------------------------- | ------------------------------------------- |
| Node.js                      | **22.19 ou superior** (recomendado: LTS 24) |
| npm                          | 10 ou superior                              |
| `@modelcontextprotocol/sdk`  | ^1.12.1                                     |
| `zod`                        | ^3.25.46                                    |

> O **MCP Inspector requer Node 22.19+** para rodar. Use essa versão para seguir os passos acima.

Confira as versões instaladas:
```bash
node -v && npm -v
```

---

## Documentação Adicional

Para aprofundamento em tópicos específicos:

| Documento | Conteúdo |
|-----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Diagramas C4, fluxo de dados, decisões arquiteturais, extensibilidade |
| [docs/SETUP.md](./docs/SETUP.md) | Configuração detalhada, variáveis de ambiente, portas |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Docker, Kubernetes, CI/CD, reverse proxy, monitoramento |

---

## Licença

[Seu licença aqui]
