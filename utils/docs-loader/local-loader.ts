import path from "node:path";
import { DocsLoader } from "./interface";
import { readdir, readFile } from "node:fs/promises";
import { Document } from "../../lib/llamaindex";

const DOCS_PATH = path.join(__dirname, "..", "..", "docs");

export class LocalDocsLoader implements DocsLoader {
  async getDocsFiles(): Promise<string[]> {
    return await readdir(DOCS_PATH, {
      encoding: "utf-8",
    });
  }

  async getDocsContent(fileName: string) {
    const filePath = path.join(DOCS_PATH, fileName);
    const fileContent = await readFile(filePath, {
      encoding: "utf-8",
    });
    const document = new Document({ text: fileContent });
    return [document];
  }

  async getDatabase(_id: string): Promise<string> {
    throw new Error("getDatabase is not supported in LocalDocsLoader");
  }
}
