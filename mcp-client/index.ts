import Anthropic from "@anthropic-ai/sdk";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import readline from "readline/promises";

import dotenv from "dotenv";

dotenv.config({ quiet: true }); // load environment variables from .env

const ANTHROPIC_MODEL = "claude-haiku-4-5";
// Sonnet 5 thinks adaptively unless told otherwise, and max_tokens caps thinking
// plus the reply, so leave room for both.
const MAX_TOKENS = 10000;
const MAX_TOOL_TURNS = 10;

class MCPClient {
  private mcp: Client;
  private _anthropic: Anthropic | null = null;
  private transport: Transport | null = null;
  private tools: Anthropic.Tool[] = [];

  constructor() {
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }

  private get anthropic(): Anthropic {
    // Lazy-initialize Anthropic client when needed
    const options: any = { apiKey: process.env.ANTHROPIC_API_KEY };

    // Add workspace ID header if provided
    if (process.env.ANTHROPIC_WORKSPACE_ID) {
      options.defaultHeaders = {
        'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID,
      };
    }

    return this._anthropic ??= new Anthropic(options);
  }

  async connectToServer(serverPath: string) {
    /**
     * Connect to an MCP server
     *
     * @param serverPath - URL (http/https) or path to server script (.py or .js)
     */
    try {
      const isUrl = serverPath.startsWith("http://") || serverPath.startsWith("https://");

      if (isUrl) {
        // Try StreamableHTTP first (works with stateless servers)
        // then fall back to SSE for streaming servers
        const url = new URL(serverPath);
        console.log("Attempting to connect to HTTP server at", url.toString());

        try {
          this.transport = new StreamableHTTPClientTransport(url);
          await this.mcp.connect(this.transport);
          console.log("Connected via StreamableHTTP");
        } catch (streamableError: any) {
          console.log("StreamableHTTP failed, trying SSE:", streamableError?.message);
          this.transport = new SSEClientTransport(url);
          await this.mcp.connect(this.transport);
          console.log("Connected via SSE");
        }
      } else {
        // Connect via stdio
        const isJs = serverPath.endsWith(".js");
        const isPy = serverPath.endsWith(".py");
        if (!isJs && !isPy) {
          throw new Error("Server script must be a .js or .py file");
        }
        const command = isPy
          ? process.platform === "win32"
            ? "python"
            : "python3"
          : process.execPath;

        this.transport = new StdioClientTransport({
          command,
          args: [serverPath],
        });
        await this.mcp.connect(this.transport);
      }

      // List available tools
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool: any) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name),
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }

  async processQuery(query: string) {
    /**
     * Process a query using Claude and available tools
     *
     * @param query - The user's input query
     * @returns Processed response as a string
     */
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    let response = await this.anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
      tools: this.tools,
    });

    const finalText: string[] = [];

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const toolUses: Anthropic.ToolUseBlock[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          finalText.push(block.text);
        } else if (block.type === "tool_use") {
          toolUses.push(block);
        }
      }

      if (toolUses.length === 0) {
        return finalText.join("\n");
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const toolArgs = toolUse.input as { [x: string]: unknown } | undefined;
        finalText.push(
          `[Calling tool ${toolUse.name} with args ${JSON.stringify(toolArgs)}]`,
        );
        // callTool validates the result against the declared schema.
        const result = await this.mcp.callTool({
          name: toolUse.name,
          arguments: toolArgs || {},
        });

        // Extract text content from result
        let resultText = "";
        if (result.content && Array.isArray(result.content)) {
          resultText = (result.content as any[])
            .filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join("\n");
        } else if (typeof result.content === "string") {
          resultText = result.content;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: resultText,
          is_error: (result as any).isError === true,
        });
      }

      messages.push({
        role: "assistant",
        content: response.content as unknown as Anthropic.ContentBlockParam[],
      });
      messages.push({ role: "user", content: toolResults });

      response = await this.anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        messages,
        tools: this.tools,
      });
    }

    // The turn cap was hit. Keep the last response's text. If it asked for
    // more tools, say they were not run.
    let wantsTools = false;
    for (const block of response.content) {
      if (block.type === "text") {
        finalText.push(block.text);
      } else if (block.type === "tool_use") {
        wantsTools = true;
      }
    }
    if (wantsTools) {
      finalText.push(`[Stopped after ${MAX_TOOL_TURNS} tool-use turns]`);
    }
    return finalText.join("\n");
  }

  async chatLoop() {
    /**
     * Run an interactive chat loop
     */
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    // rl.question() doesn't reject on stdin EOF on its own; wire its close
    // event to an AbortSignal so EOF (Ctrl-D) and SIGINT both unblock it.
    const ac = new AbortController();
    const onClose = () => ac.abort();
    rl.on("close", onClose);
    const onSigint = () => rl.close();
    process.once("SIGINT", onSigint);

    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        let message: string;
        try {
          message = await rl.question("\nQuery: ", { signal: ac.signal });
        } catch {
          break;
        }

        if (message.toLowerCase() === "quit") break;

        try {
          const response = await this.processQuery(message);
          console.log("\n" + response);
        } catch (e) {
          console.log(`\nError: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } finally {
      process.off("SIGINT", onSigint);
      rl.off("close", onClose);
      rl.close();
    }
  }

  async cleanup() {
    /**
     * Clean up resources
     */
    await this.mcp.close();
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node build/index.js <server_url_or_script_path>");
    console.log("  URL:  http://127.0.0.1:8081/mcp");
    console.log("  File: ../server/build/index.js");
    return;
  }
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);

    // Check if we have a valid API key to continue
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.log(
        "\nNo ANTHROPIC_API_KEY found. To query these tools with Claude, set your API key:"
      );
      console.log("  export ANTHROPIC_API_KEY=your-api-key-here");
      return;
    }

    await mcpClient.chatLoop();
  } catch (e) {
    console.error("Error:", e);
    await mcpClient.cleanup();
    process.exit(1);
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
