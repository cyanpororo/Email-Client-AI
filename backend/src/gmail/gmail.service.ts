import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { SupabaseService } from '../supabase/supabase.service';
import { SendEmailDto, ModifyEmailDto } from './dto/gmail.dto';
import Fuse from 'fuse.js';
import { SemanticSearchService } from './semantic-search.service';

@Injectable()
export class GmailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly semanticSearchService: SemanticSearchService,
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
  getAuthUrl(userId: string): string {
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
      state: userId, // Pass userId in state for callback
    });
  }

  /**
   * Handle OAuth callback and store refresh token
   */
  async handleCallback(code: string, userId: string) {
    try {
      const oauth2Client = this.createOAuth2Client();

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        throw new InternalServerErrorException(
          'No refresh token received from Google',
        );
      }

      await this.storeRefreshToken(userId, tokens.refresh_token);

      return { message: 'Gmail connected successfully' };
    } catch (error) {
      console.error('[Gmail Service] handleCallback error:', error);
      throw new InternalServerErrorException('Failed to connect Gmail');
    }
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, refreshToken: string) {
    try {
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase
        .from('users')
        .update({ gmail_refresh_token: refreshToken })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('[Gmail Service] Failed to store refresh token:', error);
        throw new InternalServerErrorException(
          'Failed to store Gmail credentials',
        );
      }

      if (!data || data.length === 0) {
        console.error(
          '[Gmail Service] No rows updated. User might not exist:',
          userId,
        );
        throw new InternalServerErrorException('User not found');
      }
    } catch (error) {
      console.error('[Gmail Service] storeRefreshToken error:', error);
      throw error;
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
      throw new UnauthorizedException(
        'Gmail not connected. Please connect your Gmail account first.',
      );
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
      throw new UnauthorizedException(
        'Gmail token expired. Please reconnect your account.',
      );
    }

    return client;
  }

  /**
   * Get list of labels (mailboxes)
   * Returns labels in order: Inbox, Starred, Sent, Drafts, Archive, Trash, Custom folders
   */
  async getLabels(userId: string) {
    try {
      const auth = await this.getAuthenticatedClient(userId);
      const gmail = google.gmail({ version: 'v1', auth });

      const response = await gmail.users.labels.list({
        userId: 'me',
      });

      const labels = response.data.labels || [];

      // Define the standard folders we want to show in order
      // Note: Gmail doesn't have a separate "Archive" - archived emails just remove INBOX label
      const standardFolders = ['INBOX', 'STARRED', 'SENT', 'DRAFT', 'TRASH'];

      // Map to our mailbox format
      const mappedLabels = labels.map((label) => ({
        id: label.id,
        name: label.name,
        type: label.type,
        messagesTotal: label.messagesTotal || 0,
        messagesUnread: label.messagesUnread || 0,
      }));

      // Separate standard folders from custom folders
      const standardLabels = standardFolders
        .map((id) => mappedLabels.find((label) => label.id === id))
        .filter((label) => label !== undefined);

      // Get custom folders (user-created labels, excluding categories and system labels)
      const customLabels = mappedLabels.filter(
        (label) =>
          label.type === 'user' &&
          label.id &&
          !standardFolders.includes(label.id),
      );

      // Return standard folders first, then custom folders
      return [...standardLabels, ...customLabels];
    } catch (error) {
      console.error('Get labels error:', error);
      throw new InternalServerErrorException('Failed to fetch mailboxes');
    }
  }

  /**
   * Get emails from a specific label with pagination
   */
  async getEmails(
    userId: string,
    labelId: string = 'INBOX',
    maxResults: number = 50,
    pageToken?: string,
  ) {
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
      const emailPromises = messages.map((msg) =>
        this.getEmailById(userId, msg.id!, false),
      );
      const emails = await Promise.all(emailPromises);
      const validEmails = emails.filter((e) => e !== null);

      // Trigger background embedding generation
      // We don't await this to keep the API response fast
      this.semanticSearchService.storeEmbeddingsBatch(
        userId,
        validEmails.map((e) => ({
          id: e.id!,
          subject: e.subject,
          snippet: e.snippet || undefined,
          body: e.body,
          from: e.from,
        })),
      ).catch(err => console.error('Background embedding generation failed:', err));

      return {
        emails: validEmails,
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
  async getEmailById(userId: string, emailId: string, generateEmbedding: boolean = true) {
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
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value || '';

      const from = this.parseEmailAddress(getHeader('from'));
      const to = this.parseEmailAddresses(getHeader('to'));
      const cc = this.parseEmailAddresses(getHeader('cc'));
      const subject = getHeader('subject');

      // Extract body
      const body = this.extractBody(message.payload);

      // Check for attachments
      const attachments = this.extractAttachments(message.payload);

      const emailData = {
        id: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds || [],
        from,
        to,
        cc: cc.length > 0 ? cc : undefined,
        subject,
        snippet: message.snippet,
        body,
        timestamp: new Date(
          parseInt(message.internalDate || '0'),
        ).toISOString(),
        isRead: !message.labelIds?.includes('UNREAD'),
        isStarred: message.labelIds?.includes('STARRED') || false,
        hasAttachments: attachments.length > 0,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      if (generateEmbedding && emailData.id) {
        // Trigger background embedding generation
        this.semanticSearchService.storeEmbedding(
          userId,
          emailData.id,
          {
            subject: emailData.subject,
            snippet: emailData.snippet || undefined,
            body: emailData.body,
            from: emailData.from,
          }
        ).catch(err => console.error('Background embedding generation failed:', err));
      }

      return emailData;
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

      // Escape HTML characters and convert newlines to <br>
      const formattedBody = emailDto.body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

      // Create email message headers
      const headers = [
        `To: ${emailDto.to.join(', ')}`,
        emailDto.cc?.length ? `Cc: ${emailDto.cc.join(', ')}` : null,
        emailDto.bcc?.length ? `Bcc: ${emailDto.bcc.join(', ')}` : null,
        `Subject: ${emailDto.subject}`,
        emailDto.inReplyTo ? `In-Reply-To: ${emailDto.inReplyTo}` : null,
        emailDto.references ? `References: ${emailDto.references}` : null,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
      ].filter((header) => header !== null);

      // Combine headers and body with a blank line separator
      const message = [...headers, '', formattedBody].join('\r\n');

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
  async modifyEmail(
    userId: string,
    emailId: string,
    modifyDto: ModifyEmailDto,
  ) {
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
   * Disconnect Gmail account and revoke tokens
   */
  async disconnect(userId: string) {
    const supabase = this.supabaseService.getClient();

    // Get refresh token before deleting
    const { data: user } = await supabase
      .from('users')
      .select('gmail_refresh_token')
      .eq('id', userId)
      .single();

    // Revoke the refresh token with Google
    if (user?.gmail_refresh_token) {
      try {
        const client = this.createOAuth2Client();
        client.setCredentials({
          refresh_token: user.gmail_refresh_token,
        });
        await client.revokeCredentials();
      } catch (error) {
        console.error('Failed to revoke Gmail token:', error);
        // Continue with disconnect even if revocation fails
      }
    }

    // Clear refresh token from database
    const { error } = await supabase
      .from('users')
      .update({ gmail_refresh_token: null })
      .eq('id', userId);

    if (error) {
      throw new InternalServerErrorException('Failed to disconnect Gmail');
    }

    return { message: 'Gmail disconnected successfully' };
  }

  /**
   * Fuzzy search emails across all mailboxes
   * Searches subject, sender name, sender email, and optionally body/snippet
   */
  async searchEmails(userId: string, query: string, limit: number = 50) {
    try {
      if (!query || query.trim().length === 0) {
        return { emails: [], query };
      }

      // Fetch emails from all important mailboxes
      const labelIds = ['INBOX', 'SENT', 'STARRED'];
      const allEmails: any[] = [];

      // Fetch emails from each label
      for (const labelId of labelIds) {
        try {
          const result = await this.getEmails(userId, labelId, 100);
          allEmails.push(...result.emails.filter((e) => e !== null));
        } catch (error) {
          console.error(`Failed to fetch emails from ${labelId}:`, error);
          // Continue with other labels even if one fails
        }
      }

      // Remove duplicates based on email ID
      const uniqueEmails = Array.from(
        new Map(allEmails.map((email: any) => [email.id, email])).values(),
      );

      // Configure Fuse.js for fuzzy search
      const fuseOptions = {
        keys: [
          {
            name: 'subject',
            weight: 3, // Subject is most important
          },
          {
            name: 'from.name',
            weight: 2, // Sender name is second most important
          },
          {
            name: 'from.email',
            weight: 2, // Sender email is also important
          },
          {
            name: 'snippet',
            weight: 1, // Body snippet has lower weight
          },
        ],
        includeScore: true,
        threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
        distance: 100, // Maximum distance between query and match
        minMatchCharLength: 2, // Minimum character length for matches
        ignoreLocation: true, // Search entire string, not just start
      };

      // Create Fuse instance and search
      const fuse = new Fuse(uniqueEmails, fuseOptions);
      const searchResults = fuse.search(query);

      // Extract emails from results and limit
      const rankedEmails = searchResults
        .slice(0, limit)
        .map((result) => result.item);

      return {
        emails: rankedEmails,
        query,
        totalResults: searchResults.length,
      };
    } catch (error) {
      console.error('Search emails error:', error);
      throw new InternalServerErrorException('Failed to search emails');
    }
  }

  // Helper methods

  private parseEmailAddress(emailString: string): {
    name: string;
    email: string;
  } {
    const match =
      emailString.match(/^"?([^"]*)"?\s*<(.+)>$/) ||
      emailString.match(/^(.+)$/);
    if (match) {
      return {
        name: match[2] ? match[1].trim() : '',
        email: match[2] ? match[2].trim() : match[1].trim(),
      };
    }
    return { name: '', email: emailString };
  }

  private parseEmailAddresses(
    emailString: string,
  ): Array<{ name: string; email: string }> {
    if (!emailString) return [];
    return emailString.split(',').map((e) => this.parseEmailAddress(e.trim()));
  }

  private extractBody(payload: any): string {
    if (!payload) return '';

    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      const text = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      return `<div>${text.replace(/\n/g, '<br>')}</div>`;
    }

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      // Look for HTML part first, then plain text
      const htmlPart = payload.parts.find(
        (part: any) => part.mimeType === 'text/html',
      );
      if (htmlPart?.body?.data) {
        return Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      }

      const textPart = payload.parts.find(
        (part: any) => part.mimeType === 'text/plain',
      );
      if (textPart?.body?.data) {
        const text = Buffer.from(textPart.body.data, 'base64').toString(
          'utf-8',
        );
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
