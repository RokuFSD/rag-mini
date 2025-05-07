import type { Embedding } from "../../utils/types";
import { client } from "./client";

const VECTOR_SIZE = 1024 as const;
const COLLECTION_NAME = "notion_docs";

export async function storeEmbeddings(
	embeddings: Embedding[],
	collectionName = COLLECTION_NAME,
) {
	try {
		console.log("Storing embeddings...");
		const collections = await client.getCollections();
		const collectionExists = collections.collections.some(
			(collection) => collection.name === collectionName,
		);

		if (!collectionExists) {
			await client.createCollection(collectionName, {
				vectors: {
					size: VECTOR_SIZE,
					distance: "Cosine",
				},
			});
		}

		const points = embeddings.map((embedding) => ({
			id: embedding.id,
			vector: embedding.embedding,
			payload: {
				text: embedding.text,
				embedding,
				payload: {
					...embedding.metadata,
				},
			},
		}));

		await client.upsert(collectionName, { points });
		console.log("Embeddings stored successfully.");
	} catch (error) {
		console.error("Error storing embeddings:", error);
		throw error;
	}
}
