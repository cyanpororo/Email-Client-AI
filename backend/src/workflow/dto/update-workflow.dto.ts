import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateWorkflowDto {
    @IsString()
    @IsOptional()
    status?: string;

    @IsDateString()
    @IsOptional()
    snoozedUntil?: string;

    @IsString()
    @IsOptional()
    summary?: string;
}
