import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { SupabaseService } from '../supabase/supabase.service';
import { GmailModule } from '../gmail/gmail.module';
import { SummarizationService } from './summarization.service';

@Module({
    imports: [GmailModule],
    controllers: [WorkflowController],
    providers: [WorkflowService, SupabaseService, SummarizationService],
    exports: [WorkflowService],
})
export class WorkflowModule { }
