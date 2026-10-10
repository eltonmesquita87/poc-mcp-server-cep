import readline from "readline/promises";

export type QueryHandler = (query: string) => Promise<string>;

/** Interactive prompt loop; runs until 'quit', EOF (Ctrl-D) or SIGINT. */
export async function runChatLoop(handleQuery: QueryHandler): Promise<void> {
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
        const response = await handleQuery(message);
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
