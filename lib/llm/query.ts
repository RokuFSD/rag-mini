import { client } from "../db/client";
import { embed } from "./embedding";

export async function query(question: string, collection = "notion_docs") {
  const questionEmbedding = await embed(question);

  const searchResult = await client.search(collection, {
    vector: questionEmbedding,
    limit: 5,
    score_threshold: 0.65,
  });

  if (searchResult.length === 0) {
    console.log("Sorry, no relevant documents found for this question.");
    return;
  }

  const contextPieces = searchResult
    .map((hit) => {
      const text = hit.payload?.text;
      return `Content: "${text}"`;
    })
    .join("\n\n");

  await chatWithContext(contextPieces, question);
}

async function chatWithContext(context: string, question: string) {
  const controller = new AbortController();
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: "deepseek-r1:1.5b", // e.g., mistral, llama2, etc
      stream: true,
      messages: [
        {
          role: "system",
          content:
            'Answer ONLY based on the following context. If unsure or the question do not make sense for the documents, reply "Not found in the documents."\n\nContext:\n' +
            context,
        },
        {
          role: "user",
          content: question,
        },
      ],
    }),
  });

  if (!response.body) {
    console.error("No response body");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let fullAnswer = "";
  let partial = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    partial += chunk;

    const lines = partial.split("\n");
    partial = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const content = parsed.message?.content;
        if (content) {
          fullAnswer += content;
          process.stdout.write(content); // optional if you want to show as it streams
        }
      } catch {
        // Ignore JSON parse errors, incomplete chunk will be retried next loop
      }
    }
  }

  console.log("\n\nFull Answer:");
  console.log(fullAnswer);
}
