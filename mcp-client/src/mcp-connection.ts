import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export interface ToolCallResult {
  text: string;
  isError: boolean;
}

function isHttpUrl(target: string): boolean {
  return target.startsWith("http://") || target.startsWith("https://");
}

function createStdioTransport(scriptPath: string): StdioClientTransport {
  const isJs = scriptPath.endsWith(".js");
  const isPy = scriptPath.endsWith(".py");
  if (!isJs && !isPy) {
    throw new Error("Server script must be a .js or .py file");
  }
  const command = isPy
    ? process.platform === "win32"
      ? "python"
      : "python3"
    : process.execPath;

  return new StdioClientTransport({ command, args: [scriptPath] });
}

function extractText(content: unknown): string {
  if (Array.isArray(content)) {
    return content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }
  return typeof content === "string" ? content : "";
}

/** Owns the MCP client session: transport selection, tool discovery and calls. */
export class McpConnection {
  private readonly client = new Client({ name: "mcp-client-cli", version: "1.0.0" });

  /**
   * Connect to an MCP server and return the tools it exposes.
   *
   * @param serverPath - URL (http/https) or path to server script (.py or .js)
   */
  async connect(serverPath: string): Promise<Tool[]> {
    try {
      if (isHttpUrl(serverPath)) {
        await this.connectHttp(new URL(serverPath));
      } else {
        await this.client.connect(createStdioTransport(serverPath));
      }

      const { tools } = await this.client.listTools();
      console.log(
        "Connected to server with tools:",
        tools.map(({ name }) => name),
      );
      return tools;
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
    // callTool validates the result against the declared schema.
    const result = await this.client.callTool({ name, arguments: args });
    return {
      text: extractText(result.content),
      isError: result.isError === true,
    };
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  private async connectHttp(url: URL): Promise<void> {
    // Try StreamableHTTP first (works with stateless servers)
    // then fall back to SSE for streaming servers
    console.log("Attempting to connect to HTTP server at", url.toString());

    try {
      await this.client.connect(new StreamableHTTPClientTransport(url));
      console.log("Connected via StreamableHTTP");
    } catch (streamableError: any) {
      console.log("StreamableHTTP failed, trying SSE:", streamableError?.message);
      await this.client.connect(new SSEClientTransport(url));
      console.log("Connected via SSE");
    }
  }
}
