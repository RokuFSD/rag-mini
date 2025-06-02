import readline from "node:readline";
import { PromptTemplate, Settings, VectorStoreIndex } from "llamaindex";
import { ollama, OllamaEmbedding } from "@llamaindex/ollama";
import { QdrantVectorStore } from "@llamaindex/qdrant";
import { client } from "../lib/db/client";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const collectionName = "notion_docs_bge--recursive" as const;

const embedModel = new OllamaEmbedding({
  model: "bge-m3",
});

Settings.embedModel = embedModel;
Settings.llm = ollama({
  model: "deepseek-r1:1.5b",
  options: {
    temperature: 0.1,
  },
});

const vectorStore = new QdrantVectorStore({
  client,
  collectionName,
  embeddingModel: embedModel,
});

async function main() {
  rl.question("Prompt: ", async (text) => {
    const index = await VectorStoreIndex.fromVectorStore(vectorStore);
    const queryEngine = index.asChatEngine({
      similarityTopK: 3,
      contextSystemPrompt: new PromptTemplate({
        templateVars: ["context"],
        template: `You must answer questions ONLY based on the context information below. If the information is not available in the context, respond with "I don't know" and do not make up information.
        Context information:
        ---------------------
        {context}
        ---------------------

        Based ONLY on the context above, answer the following question. If the context doesn't contain relevant information, say "I don't know".`,
      }),
      systemPrompt: `You are a helpful assistant. Answer questions ONLY based on the provided context.
        If the information is not available in the context, respond with "I don't know" and do not make up information.`,
    });
    const response = await queryEngine.chat({ stream: true, message: text });
    for await (const chunk of response) {
      process.stdout.write(chunk.message.content.toString());
    }
    process.exit(0);
  });
}

main();
