import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    Res,
    HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { GmailService } from './gmail.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GmailAuthDto, SendEmailDto, ModifyEmailDto } from './dto/gmail.dto';

@Controller('api/gmail')
export class GmailController {
    constructor(private readonly gmailService: GmailService) { }

    /**
     * Initiate Gmail OAuth flow
     */
    @Get('auth')
    @UseGuards(JwtAuthGuard)
    getAuthUrl() {
        const authUrl = this.gmailService.getAuthUrl();
        return { authUrl };
    }

    /**
     * OAuth callback endpoint
     */
    @Get('callback')
    async handleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ) {
        try {
            // In production, validate state parameter to prevent CSRF
            // For now, we'll extract userId from state
            const userId = state; // You should encode/decode this properly

            await this.gmailService.handleCallback(code, userId);

            // Redirect to frontend success page
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/inbox?gmail=connected`);
        } catch (error) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${frontendUrl}/inbox?gmail=error`);
        }
    }

    /**
     * Exchange authorization code for tokens (alternative to callback)
     */
    @Post('connect')
    @UseGuards(JwtAuthGuard)
    async connect(@Request() req, @Body() gmailAuthDto: GmailAuthDto) {
        return this.gmailService.handleCallback(gmailAuthDto.code, req.user.sub);
    }

    /**
     * Disconnect Gmail account
     */
    @Post('disconnect')
    @UseGuards(JwtAuthGuard)
    async disconnect(@Request() req) {
        return this.gmailService.disconnect(req.user.sub);
    }

    /**
     * Get mailboxes (labels)
     */
    @Get('mailboxes')
    @UseGuards(JwtAuthGuard)
    async getMailboxes(@Request() req) {
        return this.gmailService.getLabels(req.user.sub);
    }

    /**
     * Get emails from a mailbox
     */
    @Get('mailboxes/:id/emails')
    @UseGuards(JwtAuthGuard)
    async getEmails(
        @Request() req,
        @Param('id') mailboxId: string,
        @Query('limit') limit?: string,
        @Query('pageToken') pageToken?: string,
    ) {
        const maxResults = limit ? parseInt(limit) : 50;
        return this.gmailService.getEmails(req.user.sub, mailboxId, maxResults, pageToken);
    }

    /**
     * Get a single email by ID
     */
    @Get('emails/:id')
    @UseGuards(JwtAuthGuard)
    async getEmail(@Request() req, @Param('id') emailId: string) {
        return this.gmailService.getEmailById(req.user.sub, emailId);
    }

    /**
     * Send an email
     */
    @Post('emails/send')
    @UseGuards(JwtAuthGuard)
    async sendEmail(@Request() req, @Body() sendEmailDto: SendEmailDto) {
        return this.gmailService.sendEmail(req.user.sub, sendEmailDto);
    }

    /**
     * Reply to an email
     */
    @Post('emails/:id/reply')
    @UseGuards(JwtAuthGuard)
    async replyToEmail(
        @Request() req,
        @Param('id') emailId: string,
        @Body() sendEmailDto: SendEmailDto,
    ) {
        // Get original email to set In-Reply-To and References headers
        const originalEmail = await this.gmailService.getEmailById(req.user.sub, emailId);

        if (originalEmail) {
            sendEmailDto.inReplyTo = emailId;
            sendEmailDto.references = emailId;
        }

        return this.gmailService.sendEmail(req.user.sub, sendEmailDto);
    }

    /**
     * Modify email (mark read/unread, star, delete, etc.)
     */
    @Post('emails/:id/modify')
    @UseGuards(JwtAuthGuard)
    async modifyEmail(
        @Request() req,
        @Param('id') emailId: string,
        @Body() modifyDto: ModifyEmailDto,
    ) {
        return this.gmailService.modifyEmail(req.user.sub, emailId, modifyDto);
    }

    /**
     * Mark email as read
     */
    @Post('emails/:id/read')
    @UseGuards(JwtAuthGuard)
    async markAsRead(@Request() req, @Param('id') emailId: string) {
        return this.gmailService.modifyEmail(req.user.sub, emailId, {
            removeLabelIds: ['UNREAD'],
        });
    }

    /**
     * Mark email as unread
     */
    @Post('emails/:id/unread')
    @UseGuards(JwtAuthGuard)
    async markAsUnread(@Request() req, @Param('id') emailId: string) {
        return this.gmailService.modifyEmail(req.user.sub, emailId, {
            addLabelIds: ['UNREAD'],
        });
    }

    /**
     * Toggle star
     */
    @Post('emails/:id/star')
    @UseGuards(JwtAuthGuard)
    async toggleStar(@Request() req, @Param('id') emailId: string, @Body('starred') starred: boolean) {
        return this.gmailService.modifyEmail(req.user.sub, emailId, {
            addLabelIds: starred ? ['STARRED'] : undefined,
            removeLabelIds: !starred ? ['STARRED'] : undefined,
        });
    }

    /**
     * Archive email
     */
    @Post('emails/:id/archive')
    @UseGuards(JwtAuthGuard)
    async archiveEmail(@Request() req, @Param('id') emailId: string) {
        return this.gmailService.modifyEmail(req.user.sub, emailId, {
            removeLabelIds: ['INBOX'],
        });
    }

    /**
     * Delete email (move to trash)
     */
    @Post('emails/:id/delete')
    @UseGuards(JwtAuthGuard)
    async deleteEmail(@Request() req, @Param('id') emailId: string) {
        return this.gmailService.modifyEmail(req.user.sub, emailId, {
            addLabelIds: ['TRASH'],
            removeLabelIds: ['INBOX'],
        });
    }

    /**
     * Get attachment
     */
    @Get('emails/:messageId/attachments/:attachmentId')
    @UseGuards(JwtAuthGuard)
    async getAttachment(
        @Request() req,
        @Param('messageId') messageId: string,
        @Param('attachmentId') attachmentId: string,
        @Res() res: Response,
    ) {
        const attachment = await this.gmailService.getAttachment(
            req.user.sub,
            messageId,
            attachmentId,
        );

        // Decode base64 data
        const buffer = Buffer.from(attachment.data!, 'base64');

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);
    }
}
