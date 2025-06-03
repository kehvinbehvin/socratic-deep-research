import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(region: string, bucket: string) {
    this.s3Client = new S3Client({ region });
    this.bucket = bucket;
  }

  async uploadJson(key: string, data: any): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json'
    });

    await this.s3Client.send(command);
  }
} 