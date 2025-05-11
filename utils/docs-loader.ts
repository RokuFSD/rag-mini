import { readFile, readdir } from "node:fs/promises";
import { MarkdownNodeParser } from "@llamaindex/core/node-parser";
import { Document } from "@llamaindex/core/schema";
import path from "node:path";

const DOCS_PATH = path.join(__dirname, "..", "docs");

export async function getDocsFiles(): Promise<string[]> {
  return await readdir(DOCS_PATH, {
    encoding: "utf-8",
  });
}

export async function getFileContent(fileName: string): Promise<string> {
  const filePath = path.join(DOCS_PATH, fileName);
  const fileContent = await readFile(filePath, {
    encoding: "utf-8",
  });
  return fileContent;
}

export async function chunkText(
  parser: MarkdownNodeParser,
  fileContent: string,
) {
  const document = new Document({ text: fileContent });
  return parser.getNodesFromDocuments([document]);
}
