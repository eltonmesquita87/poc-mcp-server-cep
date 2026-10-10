import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ANTHROPIC_MODEL, MAX_TOKENS, MAX_TOOL_TURNS } from "./config.js";
import type { ToolCallResult } from "./mcp-connection.js";

/** What the agent needs from the tool provider (satisfied by McpConnection). */
export interface ToolExecutor {
  callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult>;
}

export function toAnthropicTools(tools: Tool[]): Anthropic.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

/** Runs the Claude <-> tools conversation loop for a single user query. */
export class ClaudeAgent {
  constructor(
    private readonly anthropic: Anthropic,
    private readonly executor: ToolExecutor,
    private readonly tools: Anthropic.Tool[],
  ) {}

  /**
   * Process a query using Claude and available tools
   *
   * @param query - The user's input query
   * @returns Processed response as a string
   */
  async processQuery(query: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: query }];
    const finalText: string[] = [];

    let response = await this.createMessage(messages);

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const toolUses = this.collectBlocks(response, finalText);
      if (toolUses.length === 0) {
        return finalText.join("\n");
      }

      const toolResults = await this.runTools(toolUses, finalText);

      messages.push({
        role: "assistant",
        content: response.content as unknown as Anthropic.ContentBlockParam[],
      });
      messages.push({ role: "user", content: toolResults });

      response = await this.createMessage(messages);
    }

    // The turn cap was hit. Keep the last response's text. If it asked for
    // more tools, say they were not run.
    if (this.collectBlocks(response, finalText).length > 0) {
      finalText.push(`[Stopped after ${MAX_TOOL_TURNS} tool-use turns]`);
    }
    return finalText.join("\n");
  }

  private createMessage(messages: Anthropic.MessageParam[]) {
    return this.anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
      tools: this.tools,
    });
  }

  /** Appends the response's text blocks to `finalText` and returns its tool_use blocks. */
  private collectBlocks(
    response: Anthropic.Message,
    finalText: string[],
  ): Anthropic.ToolUseBlock[] {
    const toolUses: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        finalText.push(block.text);
      } else if (block.type === "tool_use") {
        toolUses.push(block);
      }
    }
    return toolUses;
  }

  private async runTools(
    toolUses: Anthropic.ToolUseBlock[],
    finalText: string[],
  ): Promise<Anthropic.ToolResultBlockParam[]> {
    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUses) {
      const args = toolUse.input as Record<string, unknown> | undefined;
      finalText.push(
        `[Calling tool ${toolUse.name} with args ${JSON.stringify(args)}]`,
      );

      const { text, isError } = await this.executor.callTool(toolUse.name, args || {});
      results.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: text,
        is_error: isError,
      });
    }

    return results;
  }
}
