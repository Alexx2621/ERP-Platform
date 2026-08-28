import { FileStoragePort, PutObjectInput } from "../application/ports/file-storage.port";

export class FakeFileStorageAdapter implements FileStoragePort {
  readonly putObjectCalls: PutObjectInput[] = [];
  readonly deleteObjectCalls: string[] = [];
  private readonly objects = new Set<string>();

  async putObject(input: PutObjectInput): Promise<void> {
    this.putObjectCalls.push(input);
    this.objects.add(input.key);
  }

  async getSignedDownloadUrl(key: string, ttlSeconds: number): Promise<string> {
    return `https://fake-storage.local/${key}?ttl=${ttlSeconds}`;
  }

  async deleteObject(key: string): Promise<void> {
    this.deleteObjectCalls.push(key);
    this.objects.delete(key);
  }

  has(key: string): boolean {
    return this.objects.has(key);
  }
}
