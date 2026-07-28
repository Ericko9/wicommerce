import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptConfig(data: Record<string, any>, secret: string): string {
  const text = JSON.stringify(data);
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptConfig<T = Record<string, any>>(encryptedText: string, secret: string): T {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    try {
      return JSON.parse(encryptedText);
    } catch {
      throw new Error('Format teks terenkripsi tidak valid');
    }
  }

  const [ivHex, authTagHex, encryptedData] = parts;
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}
