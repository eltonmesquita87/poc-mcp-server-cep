import Anthropic from "@anthropic-ai/sdk";

export const ANTHROPIC_MODEL = "claude-haiku-4-5";
// Sonnet 5 thinks adaptively unless told otherwise, and max_tokens caps thinking
// plus the reply, so leave room for both.
export const MAX_TOKENS = 10000;
export const MAX_TOOL_TURNS = 10;

export function createAnthropicClient(): Anthropic {
  const options: ConstructorParameters<typeof Anthropic>[0] = {
    apiKey: process.env.ANTHROPIC_API_KEY,
  };

  // Add workspace ID header if provided
  if (process.env.ANTHROPIC_WORKSPACE_ID) {
    options.defaultHeaders = {
      "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID,
    };
  }

  return new Anthropic(options);
}
