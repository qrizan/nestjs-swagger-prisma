import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Ekstensi berkas ditentukan dari isi berkas, tidak pernah dari nama yang
 * dikirim klien. Nama dari klien pernah membuat `.html` mendarat di direktori
 * yang disajikan statis, lalu disajikan sebagai `text/html` — stored XSS.
 */
const IMAGE_SIGNATURES = [
  { ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
] as const;

function imageExtension(buffer: Buffer): string {
  const signature = IMAGE_SIGNATURES.find(({ magic }) =>
    magic.every((byte, index) => buffer[index] === byte),
  );

  if (!signature) {
    throw new BadRequestException('File is not a PNG or JPEG image');
  }

  return signature.ext;
}

/**
 * Menulis gambar ke disk hanya setelah isinya diperiksa. Berbeda dari
 * `diskStorage`, yang menulis lebih dulu lalu memvalidasi — berkas yang ditolak
 * pun tetap mendarat.
 */
export async function saveImage(
  buffer: Buffer,
  directory: string,
): Promise<string> {
  const filename = `${randomUUID()}.${imageExtension(buffer)}`;

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), buffer);

  return filename;
}
