-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG document chunks table
CREATE TABLE "documents" (
    "id"        TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "source"    TEXT NOT NULL,
    "chunk"     INTEGER NOT NULL,
    "content"   TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- IVFFlat index for fast approximate cosine similarity search
-- lists=10 is appropriate for small datasets (< 10k rows)
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
