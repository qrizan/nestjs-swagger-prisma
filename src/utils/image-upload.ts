import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

/** Ekstensi ditentukan dari isi berkas, bukan dari nama yang dikirim klien. */
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

/** Menulis ke disk hanya setelah isi berkas diperiksa. Nama berkas dari server. */
export async function saveImage(
  buffer: Buffer,
  directory: string,
): Promise<string> {
  const filename = `${randomUUID()}.${imageExtension(buffer)}`;

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), buffer);

  return filename;
}
