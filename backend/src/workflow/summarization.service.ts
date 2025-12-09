import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SummarizePayload = {
  subject: string;
  snippet: string;
  body: string;
};

@Injectable()
export class SummarizationService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate a concise summary for an email using Perplexity Chat Completions API.
   */
  async summarizeEmail(payload: SummarizePayload): Promise<string> {
    const apiKey = this.configService.get<string>('PERPLEXITY_API_KEY');
    const model = this.configService.get<string>('PERPLEXITY_MODEL');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Missing PERPLEXITY_API_KEY. Please set it in the environment.',
      );
    }

    const prompt = [
      'You are an assistant that summarizes emails into 2-3 bullet points (max 60 words total).',
      'Use a crisp, action-oriented tone. Include deadlines or requests if present.',
      '',
      `Subject: ${payload.subject || '(no subject)'}`,
      `Snippet: ${payload.snippet || '(empty)'}`,
      'Body (may contain HTML):',
      this.stripHtml(payload.body).slice(0, 6000),
    ].join('\n');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You summarize emails for busy users.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.error?.message || data?.message || 'Unknown error';
      console.error('Perplexity summarization failed:', response.status, data);
      throw new InternalServerErrorException(
        `Failed to generate summary: ${errorMessage}`,
      );
    }

    const summary = data?.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      throw new InternalServerErrorException(
        'Perplexity returned an empty summary',
      );
    }

    return summary;
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
