import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Response Interfaces
interface CEPSResponse {
  erro?: boolean;
}

interface AddressResponse extends CEPSResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado: string;
  regiao: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

interface FormattedAddress {
  endereco: string;
  estado: string;
}

// Optional: Define configuration schema to require configuration at connection time
export const configSchema = z.object({
  debug: z.boolean().default(true).describe("Enable debug logging"),
});

export default function createStatelessServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    id: "buscar-cep",
    name: "Buscar endereço pelo CEP",
    version: "0.1.0",
  });

  function sanitizeCEP(rawCep: string): string {
    const cep = rawCep.replace(/\D/g, "");

    if (!/^\d{8}$/.test(cep)) {
      throw new Error("CEP inválido. Envie um CEP com 8 dígitos numéricos.");
    }

    return cep;
  }

  async function handleAddress(cep: string): Promise<FormattedAddress> {
    const url = new URL(`https://viacep.com.br/ws/${sanitizeCEP(cep)}/json/`);
    const response = await fetch(url.toString());
    const data = (await response.json()) as AddressResponse;

    if (!data || data.erro) {
      throw new Error("Erro ao buscar endereço. Envie novamente por favor!");
    }

    return {
      endereco: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`,
      estado: data.uf,
    };
  }

  // Add a tool
  server.tool(
    "busca_cep",
    "Busca o cep de um cliente",
    {
      cep: z.string().describe("Número do CEP"),
    },
    async ({ cep }) => {
      const result = await handleAddress(cep);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server.server;
}
