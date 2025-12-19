import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { EmbeddingService } from './embedding.service';

export interface EmailEmbedding {
    id: string;
    user_id: string;
    gmail_message_id: string;
    subject: string;
    body_snippet: string;
    sender_email: string;
    sender_name: string;
    embedding: number[];
    created_at: string;
    updated_at: string;
}

export interface SemanticSearchResult {
    gmail_message_id: string;
    subject: string;
    body_snippet: string;
    sender_email: string;
    sender_name: string;
    similarity: number;
}

@Injectable()
export class SemanticSearchService {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly embeddingService: EmbeddingService,
    ) { }

    /**
     * Store email embedding in database
     * IMPORTANT: Checks if embedding already exists before generating new one
     */
    async storeEmbedding(
        userId: string,
        gmailMessageId: string,
        email: {
            subject: string;
            body?: string;
            snippet?: string;
            from: { name?: string; email: string };
        },
    ): Promise<void> {
        try {
            if (!this.embeddingService.isAvailable()) {
                console.warn(
                    '[SemanticSearch] Embedding service not available, skipping embedding generation',
                );
                return;
            }

            // Check if embedding already exists - DON'T regenerate if it does!
            const exists = await this.hasEmbedding(userId, gmailMessageId);
            if (exists) {
                console.log(
                    `[SemanticSearch] Embedding already exists for email ${gmailMessageId}, skipping generation`,
                );
                return;
            }

            // Prepare email content for embedding
            const content = this.embeddingService.prepareEmailForEmbedding({
                subject: email.subject,
                body: email.body,
                snippet: email.snippet,
                from: email.from,
            });

            // Generate embedding
            console.log(
                `[SemanticSearch] Generating embedding for email ${gmailMessageId}`,
            );
            const { embedding } = await this.embeddingService.generateEmbedding(
                content,
            );

            // Store in database
            const supabase = this.supabaseService.getClient();

            const { error } = await supabase.from('email_embeddings').upsert(
                {
                    user_id: userId,
                    gmail_message_id: gmailMessageId,
                    subject: email.subject,
                    body_snippet: email.snippet || email.body?.substring(0, 500) || '',
                    sender_email: email.from.email,
                    sender_name: email.from.name || '',
                    embedding: JSON.stringify(embedding),
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: 'user_id,gmail_message_id',
                },
            );

            if (error) {
                console.error('[SemanticSearch] Error storing embedding:', error);
                throw new Error('Failed to store embedding');
            }

            console.log(
                `[SemanticSearch] Successfully stored embedding for email ${gmailMessageId}`,
            );
        } catch (error) {
            console.error('[SemanticSearch] Error in storeEmbedding:', error);
            // Don't throw - we don't want embedding failures to break email operations
        }
    }

    /**
     * Store embeddings for multiple emails in batch
     * IMPORTANT: Only generates embeddings for emails that don't already have them
     */
    async storeEmbeddingsBatch(
        userId: string,
        emails: Array<{
            id: string;
            subject: string;
            body?: string;
            snippet?: string;
            from: { name?: string; email: string };
        }>,
    ): Promise<void> {
        try {
            if (!this.embeddingService.isAvailable()) {
                console.warn(
                    '[SemanticSearch] Embedding service not available, skipping batch embedding generation',
                );
                return;
            }

            // Filter out emails that already have embeddings
            const emailsToEmbed = await this.filterEmailsWithoutEmbeddings(
                userId,
                emails.map((e) => e.id),
            );

            if (emailsToEmbed.length === 0) {
                console.log(
                    '[SemanticSearch] All emails already have embeddings, skipping API call',
                );
                return;
            }

            console.log(
                `[SemanticSearch] Generating embeddings for ${emailsToEmbed.length} emails (${emails.length - emailsToEmbed.length} already embedded)`,
            );

            // Filter the email objects to only include those without embeddings
            const filteredEmails = emails.filter((email) =>
                emailsToEmbed.includes(email.id),
            );

            // Prepare all email contents
            const contents = filteredEmails.map((email) =>
                this.embeddingService.prepareEmailForEmbedding({
                    subject: email.subject,
                    body: email.body,
                    snippet: email.snippet,
                    from: email.from,
                }),
            );

            // Generate embeddings in batch
            const embeddingResults = await this.embeddingService.generateEmbeddings(
                contents,
            );

            // Prepare records for insertion
            const records = filteredEmails.map((email, index) => ({
                user_id: userId,
                gmail_message_id: email.id,
                subject: email.subject,
                body_snippet: email.snippet || email.body?.substring(0, 500) || '',
                sender_email: email.from.email,
                sender_name: email.from.name || '',
                embedding: JSON.stringify(embeddingResults[index].embedding),
                updated_at: new Date().toISOString(),
            }));

            // Store in database
            const supabase = this.supabaseService.getClient();

            const { error } = await supabase.from('email_embeddings').upsert(records, {
                onConflict: 'user_id,gmail_message_id',
            });

            if (error) {
                console.error('[SemanticSearch] Error storing batch embeddings:', error);
                throw new Error('Failed to store batch embeddings');
            }

            console.log(
                `[SemanticSearch] Successfully stored ${filteredEmails.length} embeddings`,
            );
        } catch (error) {
            console.error('[SemanticSearch] Error in storeEmbeddingsBatch:', error);
            // Don't throw - we don't want embedding failures to break email operations
        }
    }

    /**
     * Filter out email IDs that already have embeddings
     * Returns only email IDs that need embeddings generated
     */
    private async filterEmailsWithoutEmbeddings(
        userId: string,
        emailIds: string[],
    ): Promise<string[]> {
        try {
            const supabase = this.supabaseService.getClient();

            // Get all existing embeddings for these emails
            const { data, error } = await supabase
                .from('email_embeddings')
                .select('gmail_message_id')
                .eq('user_id', userId)
                .in('gmail_message_id', emailIds);

            if (error) {
                console.error(
                    '[SemanticSearch] Error checking existing embeddings:',
                    error,
                );
                // If there's an error, assume all need embeddings to be safe
                return emailIds;
            }

            const existingIds = new Set(data.map((row) => row.gmail_message_id));
            return emailIds.filter((id) => !existingIds.has(id));
        } catch (error) {
            console.error(
                '[SemanticSearch] Error in filterEmailsWithoutEmbeddings:',
                error,
            );
            // If there's an error, assume all need embeddings to be safe
            return emailIds;
        }
    }

    /**
     * Perform semantic search using vector similarity
     */
    async semanticSearch(
        userId: string,
        query: string,
        matchThreshold: number = 0.5,
        matchCount: number = 50,
    ): Promise<SemanticSearchResult[]> {
        try {
            if (!this.embeddingService.isAvailable()) {
                throw new Error('Semantic search not available - embedding service not configured');
            }

            // Generate embedding for search query
            const { embedding: queryEmbedding } =
                await this.embeddingService.generateEmbedding(query);

            // Call Supabase RPC function for vector similarity search
            const supabase = this.supabaseService.getClient();

            const { data, error } = await supabase.rpc('search_emails_semantic', {
                query_embedding: JSON.stringify(queryEmbedding),
                query_user_id: userId,
                match_threshold: matchThreshold,
                match_count: matchCount,
            });

            if (error) {
                console.error('[SemanticSearch] Error in semantic search:', error);
                throw new Error('Semantic search failed');
            }

            return (data || []).map((row: any) => ({
                gmail_message_id: row.gmail_message_id,
                subject: row.subject,
                body_snippet: row.body_snippet,
                sender_email: row.sender_email,
                sender_name: row.sender_name,
                similarity: row.similarity,
            }));
        } catch (error) {
            console.error('[SemanticSearch] Error in semanticSearch:', error);
            throw new InternalServerErrorException('Semantic search failed');
        }
    }

    /**
     * Check if embedding exists for an email
     */
    async hasEmbedding(userId: string, gmailMessageId: string): Promise<boolean> {
        try {
            const supabase = this.supabaseService.getClient();

            const { data, error } = await supabase
                .from('email_embeddings')
                .select('id')
                .eq('user_id', userId)
                .eq('gmail_message_id', gmailMessageId)
                .maybeSingle();

            if (error) {
                console.error('[SemanticSearch] Error checking embedding:', error);
                return false;
            }

            return !!data;
        } catch (error) {
            console.error('[SemanticSearch] Error in hasEmbedding:', error);
            return false;
        }
    }

    /**
     * Delete embedding for an email
     */
    async deleteEmbedding(userId: string, gmailMessageId: string): Promise<void> {
        try {
            const supabase = this.supabaseService.getClient();

            const { error } = await supabase
                .from('email_embeddings')
                .delete()
                .eq('user_id', userId)
                .eq('gmail_message_id', gmailMessageId);

            if (error) {
                console.error('[SemanticSearch] Error deleting embedding:', error);
            }
        } catch (error) {
            console.error('[SemanticSearch] Error in deleteEmbedding:', error);
        }
    }

    /**
     * Get count of stored embeddings for a user
     */
    async getEmbeddingCount(userId: string): Promise<number> {
        try {
            const supabase = this.supabaseService.getClient();

            const { count, error } = await supabase
                .from('email_embeddings')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (error) {
                console.error('[SemanticSearch] Error counting embeddings:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            console.error('[SemanticSearch] Error in getEmbeddingCount:', error);
            return 0;
        }
    }
}
