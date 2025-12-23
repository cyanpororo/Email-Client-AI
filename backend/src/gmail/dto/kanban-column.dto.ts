import {
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  gmailLabel?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  gmailLabel?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ReorderColumnsDto {
  @IsString({ each: true })
  columnIds: string[];
}

export interface KanbanColumn {
  id: string;
  user_id: string;
  name: string;
  gmail_label: string | null;
  position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
