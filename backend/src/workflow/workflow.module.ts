import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { SupabaseService } from '../supabase/supabase.service';

@Module({
    controllers: [WorkflowController],
    providers: [WorkflowService, SupabaseService],
    exports: [WorkflowService],
})
export class WorkflowModule { }
