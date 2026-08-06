import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

/**
 * Origin dipisah koma, masing-masing hanya skema, host, dan port opsional.
 * Garis miring di ujung ditolak agar cocok dengan header `Origin` dari browser.
 */
const ORIGIN_LIST = /^https?:\/\/[^\s/]+(,https?:\/\/[^\s/]+)*$/;

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty({ message: 'is required (PostgreSQL connection string)' })
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, {
    message:
      'is required, minimum 32 characters. Generate with: openssl rand -base64 32',
  })
  JWT_SECRET: string;

  @IsOptional()
  @IsInt({ message: 'must be an integer (seconds)' })
  @IsPositive({ message: 'must be greater than 0' })
  JWT_EXPIRES_IN: number = 3600;

  @IsOptional()
  @IsInt({ message: 'must be an integer' })
  @IsPositive({ message: 'must be greater than 0' })
  PORT: number = 3000;

  // Kosong atau tidak diisi berarti CORS mati, sama seperti default Nest.
  @ValidateIf((env: EnvironmentVariables) => !!env.CORS_ORIGINS)
  @IsString()
  @Matches(ORIGIN_LIST, {
    message:
      'must be a comma-separated list of origins without a trailing slash, e.g. https://app.example.com,http://localhost:5173',
  })
  CORS_ORIGINS?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const detail = errors
      .map(
        (error) =>
          `  - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
      )
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${detail}`);
  }

  return validated;
}
