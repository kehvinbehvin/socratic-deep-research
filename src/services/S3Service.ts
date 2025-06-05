import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

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

  async listObjects(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix
    });

    const response = await this.s3Client.send(command);
    return response.Contents?.map(obj => obj.Key as string) || [];
  }

  async getJson<T>(key: string): Promise<T> {
    console.log(`Getting JSON from S3: ${key}`);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.s3Client.send(command);
    console.log(`Response: ${JSON.stringify(response)}`);
    const bodyContents = await response.Body?.transformToString();
    console.log(`Body contents: ${bodyContents}`);
    if (!bodyContents) {
      throw new Error(`No content found for key: ${key}`);
    }
    console.log(`Parsed body contents: ${JSON.stringify(JSON.parse(bodyContents))}`);
    return JSON.parse(bodyContents);
  }

  async getMarkdown(key: string): Promise<string> {
    console.log(`Getting Markdown from S3: ${key}`);
    
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
  
    const response = await this.s3Client.send(command);
    const bodyContents = await response.Body?.transformToString();
  
    if (!bodyContents) {
      throw new Error(`No Markdown content found for key: ${key}`);
    }
  
    console.log(`Fetched Markdown content (length: ${bodyContents.length})`);
    return bodyContents;
  }
} 