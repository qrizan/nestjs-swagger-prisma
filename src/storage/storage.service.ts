import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';

const DEFAULT_AVATAR_KEY = 'avatar/default.png';

/** Relatif terhadap `dist/storage`, jadi menunjuk `public/` di samping `dist/`. */
const DEFAULT_AVATAR_FILE = join(
  __dirname,
  '..',
  '..',
  'public',
  'uploads',
  'avatar',
  'default.png',
);

/** Ekstensi dan tipe ditentukan dari isi berkas, bukan dari nama yang dikirim klien. */
const IMAGE_SIGNATURES = [
  { ext: 'png', mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'jpg', mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
] as const;

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private defaultAvatarReady = false;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET');
    this.publicBaseUrl = config.get<string>('S3_PUBLIC_BASE_URL');

    this.client = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION'),
      // Garage hanya melayani vhost-style kalau root_domain diset di [s3_api]; path-style selalu aktif.
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Dipanggil saat registrasi, bukan saat start, supaya proses tetap bisa naik
   * tanpa object storage. Hasilnya di-cache di memori: pemeriksaan hanya sekali
   * per proses, registrasi berikutnya tidak menyentuh jaringan.
   */
  async ensureDefaultAvatar(): Promise<string> {
    if (this.defaultAvatarReady) {
      return DEFAULT_AVATAR_KEY;
    }

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: DEFAULT_AVATAR_KEY,
        }),
      );
    } catch (error) {
      if (error?.$metadata?.httpStatusCode !== 404) {
        throw error;
      }

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: DEFAULT_AVATAR_KEY,
          Body: await readFile(DEFAULT_AVATAR_FILE),
          ContentType: 'image/png',
        }),
      );
    }

    this.defaultAvatarReady = true;
    return DEFAULT_AVATAR_KEY;
  }

  /** Mengunggah setelah isi berkas diperiksa. Nama objek dari server, bukan dari klien. */
  async upload(buffer: Buffer, prefix: string): Promise<string> {
    const signature = IMAGE_SIGNATURES.find(({ magic }) =>
      magic.every((byte, index) => buffer[index] === byte),
    );

    if (!signature) {
      throw new BadRequestException('File is not a PNG or JPEG image');
    }

    const key = `${prefix}/${randomUUID()}.${signature.ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: signature.mime,
      }),
    );

    return key;
  }

  /** Object key yang tersimpan di database dirakit jadi URL saat response disusun. */
  publicUrl(key: string | null): string | null {
    return key ? `${this.publicBaseUrl}/${key}` : null;
  }
}
