import { Module } from '@nestjs/common';
import { GmailController } from './gmail.controller';
import { GmailService } from './gmail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EmbeddingService } from './embedding.service';
import { SemanticSearchService } from './semantic-search.service';

@Module({
    controllers: [GmailController],
    providers: [GmailService, SupabaseService, EmbeddingService, SemanticSearchService],
    exports: [GmailService],
})
export class GmailModule { }
