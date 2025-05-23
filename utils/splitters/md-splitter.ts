import type {
  Document,
  MarkdownNodeParser,
  Metadata,
} from "../../lib/llamaindex";

export function splitMd(
  parser: MarkdownNodeParser,
  documents: Document<Metadata>[],
) {
  return parser.getNodesFromDocuments(documents);
}
