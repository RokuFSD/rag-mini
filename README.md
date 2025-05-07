1. Start qdrant

```bash
docker run -p 6333:6333 -p 6334:6334 -v "$(pwd)/qdrant_storage:/qdrant/storage:z" qdrant/qdrant
```

2. Embed the docs

```bash
npm run start ingest
```

3. Chat

```bash
npm run start query
```
