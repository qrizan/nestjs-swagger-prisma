import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

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
