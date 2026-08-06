import { BadRequestException } from '@nestjs/common';

/**
 * Cursor paginasi berupa tanggal ISO-8601. Nilai kosong dan string
 * `'undefined'` diperlakukan sebagai tanpa cursor; sisanya yang tidak bisa
 * diurai ditolak dengan 400.
 */
export function parseCursor(cursor: string): Date | undefined {
  if (!cursor || cursor === 'undefined') {
    return undefined;
  }

  const date = new Date(cursor.trim());

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Cursor must be a valid ISO-8601 date');
  }

  return date;
}
