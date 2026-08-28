export const FILE_STORAGE = Symbol("FILE_STORAGE");

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

/**
 * Abstracts the S3-compatible storage provider away from domain/application
 * code (MASTER_SPEC §22: "Storage compatible con S3" — MinIO locally, S3 in
 * production). `S3FileStorageAdapter` is the only implementation today; a
 * future provider swap only touches infrastructure/.
 */
export interface FileStoragePort {
  putObject(input: PutObjectInput): Promise<void>;
  /** Short-lived signed GET URL — never a permanent/public link (docs/ARCHITECTURE.md §10). */
  getSignedDownloadUrl(key: string, ttlSeconds: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}
