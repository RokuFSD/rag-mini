import { DocsLoader } from "./interface";
import type { Client } from "@notionhq/client";
import { NotionReader } from "../../lib/llamaindex";

export class NotionDocsLoader implements DocsLoader {
  reader: NotionReader;
  client: Client;

  constructor(client: Client) {
    this.client = client;
    this.reader = new NotionReader({
      client,
    });
  }

  // List all database and page IDs in the workspace
  async getDocsFiles(): Promise<string[]> {
    // List all pages
    const pages = await this.client.search({
      filter: { property: "object", value: "page" },
    });

    // const dbIds = databases.results.map((db) => db.id);
    const pageIds = pages.results.map((page) => page.id);

    return [...pageIds];
  }

  // Load the content of a page or database by its ID
  async getDocsContent(id: string) {
    const docs = await this.reader.loadData(id);
    return docs;
  }

  // Load the content of a database by its ID
  async getDatabase(id: string): Promise<string> {
    const docs = await this.reader.loadData(id);
    return docs.map((doc) => doc.text).join("\n");
  }

  // Get reader
  getReader() {
    return this.reader;
  }
}
