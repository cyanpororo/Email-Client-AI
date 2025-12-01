import { Module } from '@nestjs/common';
import { GmailController } from './gmail.controller';
import { GmailService } from './gmail.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
    controllers: [GmailController],
    providers: [GmailService, SupabaseService],
    exports: [GmailService],
})
export class GmailModule { }
