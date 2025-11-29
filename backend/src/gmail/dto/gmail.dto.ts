import { IsString, IsArray, IsOptional } from 'class-validator';

export class GmailAuthDto {
  @IsString()
  code: string;
}

export class SendEmailDto {
  @IsArray()
  @IsString({ each: true })
  to: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @IsOptional()
  @IsString()
  references?: string;
}

export class ModifyEmailDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addLabelIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeLabelIds?: string[];
}
