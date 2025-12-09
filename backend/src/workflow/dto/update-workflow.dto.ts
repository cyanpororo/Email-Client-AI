import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateWorkflowDto {
    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    previousStatus?: string;

    @IsDateString()
    @IsOptional()
    snoozedUntil?: string | null;

    @IsString()
    @IsOptional()
    summary?: string;
}
