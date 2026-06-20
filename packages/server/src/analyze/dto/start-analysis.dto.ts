import { IsOptional, IsString, IsIn, IsNotEmpty, ValidateIf } from "class-validator";

export class StartAnalysisDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  index?: string;

  @ValidateIf((o: StartAnalysisDto) => !o.code && !o.sector && !o.index)
  @IsNotEmpty({ message: "Must specify at least one of: code, sector, or index" })
  validationMarker?: string;

  @IsOptional()
  @IsString()
  @IsIn(["bull-bear", "quick-scan"])
  workflow?: string = "bull-bear";

  @IsOptional()
  @IsString()
  @IsIn(["anthropic", "openai", "deepseek"])
  provider?: string = "deepseek";

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  dataServiceUrl?: string = "http://localhost:9500";
}
