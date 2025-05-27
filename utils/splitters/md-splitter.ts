import type {
  Document,
  MarkdownNodeParser,
  Metadata,
} from "../../lib/llamaindex";

/**
 * Splits Markdown documents into nodes using the provided parser.
 *
 * @param parser - The MarkdownNodeParser instance used to parse the documents.
 * @param documents - An array of Document objects containing metadata to be parsed.
 * @returns An array of nodes extracted from the provided documents.
 */
export function splitMd(
  parser: MarkdownNodeParser,
  documents: Document<Metadata>[],
) {
  return parser.getNodesFromDocuments(documents);
}
