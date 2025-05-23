import type { Document, Metadata } from "../../lib/llamaindex";

export interface DocsLoader {
  getDocsFiles: () => Promise<string[]>;
  getDocsContent: (fileName: string) => Promise<Document<Metadata>[]>;
  getDatabase: (id: string) => Promise<string>;
}
