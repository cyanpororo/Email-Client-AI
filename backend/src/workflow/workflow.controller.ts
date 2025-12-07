import { Controller, Get, Body, Param, Put, UseGuards, Request, Post } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('workflow')
@UseGuards(AuthGuard('jwt'))
export class WorkflowController {
    constructor(private readonly workflowService: WorkflowService) { }

    @Post('batch')
    async getWorkflows(
        @Request() req,
        @Body('messageIds') messageIds: string[],
    ) {
        return this.workflowService.getWorkflows(req.user.userId, messageIds);
    }

    @Get(':messageId')
    async getWorkflow(
        @Request() req,
        @Param('messageId') messageId: string,
    ) {
        return this.workflowService.getWorkflow(req.user.userId, messageId);
    }

    @Put(':messageId')
    async updateWorkflow(
        @Request() req,
        @Param('messageId') messageId: string,
        @Body() updateDto: UpdateWorkflowDto,
    ) {
        return this.workflowService.updateWorkflow(req.user.userId, messageId, updateDto);
    }
}
