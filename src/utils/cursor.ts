import { BadRequestException } from '@nestjs/common';

/**
 * Cursor paginasi berupa tanggal ISO-8601. Nilai yang tidak bisa diurai
 * sebelumnya diteruskan ke Prisma sebagai `Invalid Date` dan muncul sebagai
 * 500, bukan 400.
 *
 * String `'undefined'` diterima sebagai "tanpa cursor" karena klien memang
 * pernah mengirimkannya apa adanya.
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
