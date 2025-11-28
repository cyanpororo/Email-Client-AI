import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { SupabaseService } from '../supabase/supabase.service';
import { SendEmailDto, ModifyEmailDto } from './dto/gmail.dto';

@Injectable()
export class GmailService {
    constructor(
        private readonly configService: ConfigService,
        private readonly supabaseService: SupabaseService,
    ) { }

    /**
     * Create OAuth2 client instance
     */
    private createOAuth2Client() {
        return new google.auth.OAuth2(
            this.configService.get<string>('GMAIL_CLIENT_ID'),
            this.configService.get<string>('GMAIL_CLIENT_SECRET'),
            this.configService.get<string>('GMAIL_REDIRECT_URI'),
        );
    }

    /**
     * Generate OAuth2 authorization URL
     */
    getAuthUrl(): string {
        const oauth2Client = this.createOAuth2Client();
        const scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.labels',
        ];

        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent', // Force consent to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens and store refresh token
     */
    async handleCallback(code: string, userId: string) {
        try {
            const oauth2Client = this.createOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);

            if (!tokens.refresh_token) {
                throw new UnauthorizedException('No refresh token received. Please revoke access and try again.');
            }

            // Store refresh token in database
            await this.storeRefreshToken(userId, tokens.refresh_token);

            return {
                message: 'Gmail connected successfully',
                accessToken: tokens.access_token,
            };
        } catch (error) {
            console.error('Gmail callback error:', error);
            throw new InternalServerErrorException('Failed to connect Gmail account');
        }
    }

    /**
     * Store refresh token securely in database
     */
    private async storeRefreshToken(userId: string, refreshToken: string) {
        const supabase = this.supabaseService.getClient();

        const { error } = await supabase
            .from('users')
            .update({ gmail_refresh_token: refreshToken })
            .eq('id', userId);

        if (error) {
            console.error('Failed to store refresh token:', error);
            throw new InternalServerErrorException('Failed to store Gmail credentials');
        }
    }

    /**
     * Get OAuth2 client with valid access token for user
     */
    private async getAuthenticatedClient(userId: string) {
        const supabase = this.supabaseService.getClient();

        const { data: user, error } = await supabase
            .from('users')
            .select('gmail_refresh_token')
            .eq('id', userId)
            .single();

        if (error || !user || !user.gmail_refresh_token) {
            throw new UnauthorizedException('Gmail not connected. Please connect your Gmail account first.');
        }

        const client = this.createOAuth2Client();

        client.setCredentials({
            refresh_token: user.gmail_refresh_token,
        });

        // Automatically refresh access token if needed
        try {
            await client.getAccessToken();
        } catch (error) {
            console.error('Token refresh failed:', error);
            throw new UnauthorizedException('Gmail token expired. Please reconnect your account.');
        }

        return client;
    }

    /**
     * Get list of labels (mailboxes)
     */
    async getLabels(userId: string) {
        try {
            const auth = await this.getAuthenticatedClient(userId);
            const gmail = google.gmail({ version: 'v1', auth });

            const response = await gmail.users.labels.list({
                userId: 'me',
            });

            const labels = response.data.labels || [];

            // Map to our mailbox format
            return labels.map(label => ({
                id: label.id,
                name: label.name,
                type: label.type,
                messagesTotal: label.messagesTotal || 0,
                messagesUnread: label.messagesUnread || 0,
            }));
        } catch (error) {
            console.error('Get labels error:', error);
            throw new InternalServerErrorException('Failed to fetch mailboxes');
        }
    }

    /**
     * Get emails from a specific label with pagination
     */
    async getEmails(userId: string, labelId: string = 'INBOX', maxResults: number = 50, pageToken?: string) {
        try {
            const auth = await this.getAuthenticatedClient(userId);
            const gmail = google.gmail({ version: 'v1', auth });

            const response = await gmail.users.messages.list({
                userId: 'me',
                labelIds: [labelId],
                maxResults,
                pageToken,
            });

            const messages = response.data.messages || [];
            const nextPageToken = response.data.nextPageToken;

            // Fetch full details for each message (in parallel)
            const emailPromises = messages.map(msg => this.getEmailById(userId, msg.id!));
            const emails = await Promise.all(emailPromises);

            return {
                emails: emails.filter(e => e !== null),
                nextPageToken,
            };
        } catch (error) {
            console.error('Get emails error:', error);
            throw new InternalServerErrorException('Failed to fetch emails');
        }
    }

    /**
     * Get a single email by ID
     */
    async getEmailById(userId: string, emailId: string) {
        try {
            const auth = await this.getAuthenticatedClient(userId);
            const gmail = google.gmail({ version: 'v1', auth });

            const response = await gmail.users.messages.get({
                userId: 'me',
                id: emailId,
                format: 'full',
            });

            const message = response.data;
            const headers = message.payload?.headers || [];

            // Extract headers
            const getHeader = (name: string) =>
                headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

            const from = this.parseEmailAddress(getHeader('from'));
            const to = this.parseEmailAddresses(getHeader('to'));
            const cc = this.parseEmailAddresses(getHeader('cc'));
            const subject = getHeader('subject');

            // Extract body
            const body = this.extractBody(message.payload);

            // Check for attachments
            const attachments = this.extractAttachments(message.payload);

            return {
                id: message.id,
                threadId: message.threadId,
                labelIds: message.labelIds || [],
                from,
                to,
                cc: cc.length > 0 ? cc : undefined,
                subject,
                snippet: message.snippet,
                body,
                timestamp: new Date(parseInt(message.internalDate || '0')).toISOString(),
                isRead: !message.labelIds?.includes('UNREAD'),
                isStarred: message.labelIds?.includes('STARRED') || false,
                hasAttachments: attachments.length > 0,
                attachments: attachments.length > 0 ? attachments : undefined,
            };
        } catch (error) {
            console.error('Get email by ID error:', error);
            return null;
        }
    }

    /**
     * Send an email
     */
    async sendEmail(userId: string, emailDto: SendEmailDto) {
        try {
            const auth = await this.getAuthenticatedClient(userId);
            const gmail = google.gmail({ version: 'v1', auth });

            // Create email message
            const messageParts = [
                `To: ${emailDto.to.join(', ')}`,
                emailDto.cc ? `Cc: ${emailDto.cc.join(', ')}` : '',
                emailDto.bcc ? `Bcc: ${emailDto.bcc.join(', ')}` : '',
                `Subject: ${emailDto.subject}`,
                emailDto.inReplyTo ? `In-Reply-To: ${emailDto.inReplyTo}` : '',
                emailDto.references ? `References: ${emailDto.references}` : '',
                'Content-Type: text/html; charset=utf-8',
                '',
                emailDto.body,
            ].filter(Boolean);

            const message = messageParts.join('\r\n');
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            return {
                id: response.data.id,
                threadId: response.data.threadId,
            };
        } catch (error) {
            console.error('Send email error:', error);
            throw new InternalServerErrorException('Failed to send email');
        }
    }

    /**
     * Modify email labels (mark read/unread, star, etc.)
     */
    async modifyEmail(userId: string, emailId: string, modifyDto: ModifyEmailDto) {
        try {
            const auth = await this.getAuthenticatedClient(userId);
            const gmail = google.gmail({ version: 'v1', auth });

            await gmail.users.messages.modify({
                userId: 'me',
                id: emailId,
                requestBody: {
                    addLabelIds: modifyDto.addLabelIds,
                    removeLabelIds: modifyDto.removeLabelIds,
                },
            });

            return { success: true };
        } catch (error) {
            console.error('Modify email error:', error);
            throw new InternalServerErrorException('Failed to modify email');
        }
    }

    /**
     * Get attachment data
     */
    async getAttachment(userId: string, messageId: string, attachmentId: string) {
        try {
            const auth = await this.getAuthenticatedClient(userId);
            const gmail = google.gmail({ version: 'v1', auth });

            const response = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId,
                id: attachmentId,
            });

            return {
                data: response.data.data,
                size: response.data.size,
            };
        } catch (error) {
            console.error('Get attachment error:', error);
            throw new InternalServerErrorException('Failed to fetch attachment');
        }
    }

    /**
     * Disconnect Gmail account
     */
    async disconnect(userId: string) {
        const supabase = this.supabaseService.getClient();

        const { error } = await supabase
            .from('users')
            .update({ gmail_refresh_token: null })
            .eq('id', userId);

        if (error) {
            throw new InternalServerErrorException('Failed to disconnect Gmail');
        }

        return { message: 'Gmail disconnected successfully' };
    }

    // Helper methods

    private parseEmailAddress(emailString: string): { name: string; email: string } {
        const match = emailString.match(/^"?([^"]*)"?\s*<(.+)>$/) || emailString.match(/^(.+)$/);
        if (match) {
            return {
                name: match[2] ? match[1].trim() : '',
                email: match[2] ? match[2].trim() : match[1].trim(),
            };
        }
        return { name: '', email: emailString };
    }

    private parseEmailAddresses(emailString: string): Array<{ name: string; email: string }> {
        if (!emailString) return [];
        return emailString.split(',').map(e => this.parseEmailAddress(e.trim()));
    }

    private extractBody(payload: any): string {
        if (!payload) return '';

        if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }

        if (payload.parts) {
            // Look for HTML part first, then plain text
            const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
            if (htmlPart?.body?.data) {
                return Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
            }

            const textPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
            if (textPart?.body?.data) {
                const text = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                return `<div>${text.replace(/\n/g, '<br>')}</div>`;
            }

            // Recursively search in multipart
            for (const part of payload.parts) {
                const body = this.extractBody(part);
                if (body) return body;
            }
        }

        return '';
    }

    private extractAttachments(payload: any, attachments: any[] = []): any[] {
        if (!payload) return attachments;

        if (payload.filename && payload.body?.attachmentId) {
            attachments.push({
                id: payload.body.attachmentId,
                name: payload.filename,
                size: payload.body.size || 0,
                type: payload.mimeType || 'application/octet-stream',
            });
        }

        if (payload.parts) {
            for (const part of payload.parts) {
                this.extractAttachments(part, attachments);
            }
        }

        return attachments;
    }
}
