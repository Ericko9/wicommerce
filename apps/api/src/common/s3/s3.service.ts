import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY') || 'minioadmin';
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY') || 'minioadmin';
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'ucp-uploads';

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    const publicUrl = `${this.configService.get<string>('S3_ENDPOINT') || 'http://localhost:9000'}/${this.bucket}/${key}`;

    return {
      uploadUrl,
      key,
      publicUrl,
    };
  }
}
