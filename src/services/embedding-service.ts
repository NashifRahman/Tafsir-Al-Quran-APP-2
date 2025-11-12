import { SentenceBERTEmbedding, VectorDatabase } from "./hybrid-search"

export class EmbeddingService {
  private static instance: EmbeddingService
  private embedding: SentenceBERTEmbedding
  private vectorDb: VectorDatabase

  private constructor() {
    this.embedding = new SentenceBERTEmbedding()
    this.vectorDb = new VectorDatabase()
  }

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService()
    }
    return EmbeddingService.instance
  }

  getEmbedding(text: string): number[] {
    return this.embedding.generateEmbedding(text)
  }

  getVectorDatabase(): VectorDatabase {
    return this.vectorDb
  }

  indexDocuments(documents: any[]): void {
    this.vectorDb.indexDocuments(documents)
  }

  clearIndex(): void {
    this.vectorDb.clear()
  }
}
