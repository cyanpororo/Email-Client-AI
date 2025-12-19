import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';

export interface EmbeddingResult {
    embedding: number[];
    dimensions: number;
}

@Injectable()
export class EmbeddingService {
    private mistralClient: Mistral;
    private readonly EMBEDDING_MODEL = 'mistral-embed';
    private readonly EMBEDDING_DIMENSIONS = 1024;

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('MISTRAL_API_KEY');
        if (!apiKey) {
            console.warn(
                '[EmbeddingService] MISTRAL_API_KEY not configured. Semantic search will not be available.',
            );
        } else {
            this.mistralClient = new Mistral({ apiKey });
        }
    }

    /**
     * Check if embedding service is available
     */
    isAvailable(): boolean {
        return !!this.mistralClient;
    }

    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text: string): Promise<EmbeddingResult> {
        if (!this.mistralClient) {
            throw new Error('Embedding service not configured');
        }

        try {
            const response = await this.mistralClient.embeddings.create({
                model: this.EMBEDDING_MODEL,
                inputs: [text],
            });

            const embedding = response.data[0]?.embedding;
            if (!embedding) {
                throw new Error('No embedding returned from Mistral API');
            }

            return {
                embedding: embedding,
                dimensions: embedding.length,
            };
        } catch (error) {
            console.error('[EmbeddingService] Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }

    /**
     * Generate embeddings for multiple texts in batch
     */
    async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
        if (!this.mistralClient) {
            throw new Error('Embedding service not configured');
        }

        try {
            // Mistral supports batch embedding natively
            const response = await this.mistralClient.embeddings.create({
                model: this.EMBEDDING_MODEL,
                inputs: texts,
            });

            return response.data.map((item) => {
                if (!item.embedding) {
                    throw new Error('No embedding returned from Mistral API');
                }
                return {
                    embedding: item.embedding,
                    dimensions: item.embedding.length,
                };
            });
        } catch (error) {
            console.error(
                '[EmbeddingService] Error generating batch embeddings:',
                error,
            );
            throw new Error('Failed to generate embeddings');
        }
    }

    /**
     * Prepare email content for embedding
     * Combines subject and body with appropriate weighting
     */
    prepareEmailForEmbedding(email: {
        subject: string;
        body?: string;
        snippet?: string;
        from?: { name?: string; email?: string };
    }): string {
        const parts: string[] = [];

        // Include subject (most important)
        if (email.subject) {
            parts.push(`Subject: ${email.subject}`);
        }

        // Include sender info
        if (email.from?.name) {
            parts.push(`From: ${email.from.name}`);
        }

        // Include body or snippet
        const content = email.body || email.snippet || '';
        if (content) {
            // Truncate very long content to avoid token limits (Mistral has ~8k token limit)
            const truncatedContent =
                content.length > 8000 ? content.substring(0, 8000) + '...' : content;
            parts.push(`Content: ${truncatedContent}`);
        }

        return parts.join('\n');
    }

    /**
     * Calculate cosine similarity between two vectors
     * Returns a value between -1 and 1, where 1 means identical
     */
    cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Get embedding dimensions for the current model
     */
    getEmbeddingDimensions(): number {
        return this.EMBEDDING_DIMENSIONS;
    }
}
