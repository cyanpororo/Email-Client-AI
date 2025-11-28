export class GmailAuthDto {
  code: string;
}

export class SendEmailDto {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}

export class ModifyEmailDto {
  addLabelIds?: string[];
  removeLabelIds?: string[];
}
