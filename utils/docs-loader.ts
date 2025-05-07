import { readFile, readdir } from "node:fs/promises";
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
