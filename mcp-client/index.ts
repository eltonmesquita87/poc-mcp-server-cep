import dotenv from "dotenv";

import { ClaudeAgent, toAnthropicTools } from "./src/claude-agent.js";
import { runChatLoop } from "./src/chat-cli.js";
import { createAnthropicClient } from "./src/config.js";
import { McpConnection } from "./src/mcp-connection.js";

dotenv.config({ quiet: true }); // load environment variables from .env

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node build/index.js <server_url_or_script_path>");
    console.log("  URL:  http://127.0.0.1:8081/mcp");
    console.log("  File: ../server/build/index.js");
    return;
  }
  const mcp = new McpConnection();
  try {
    const tools = await mcp.connect(process.argv[2]);

    // Check if we have a valid API key to continue
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log(
        "\nNo ANTHROPIC_API_KEY found. To query these tools with Claude, set your API key:"
      );
      console.log("  export ANTHROPIC_API_KEY=your-api-key-here");
      return;
    }

    const agent = new ClaudeAgent(createAnthropicClient(), mcp, toAnthropicTools(tools));
    await runChatLoop((query) => agent.processQuery(query));
  } catch (e) {
    console.error("Error:", e);
    await mcp.close();
    process.exit(1);
  } finally {
    await mcp.close();
    process.exit(0);
  }
}

main();
