import { query } from "../lib/llm/query";
import readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const collectionName = "notion_docs_bge--token" as const;

async function main() {
  rl.question("Prompt: ", async (text) => {
    await query(text, collectionName);
    process.exit(0);
  });
}

main();
