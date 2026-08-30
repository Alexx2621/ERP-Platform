export type FileObjectStatus = "ACTIVE" | "DELETED" | "PURGED";

export interface FileObjectProps {
  id: string;
  tenantId: string;
  companyId: string | null;
  ownerUserId: string;
  storageKey: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: bigint;
  status: FileObjectStatus;
  createdAt: Date;
  deletedAt: Date | null;
  purgedAt: Date | null;
}

export class FileNotDeletedError extends Error {
  constructor() {
    super("Only a DELETED file can be purged.");
    this.name = "FileNotDeletedError";
  }
}

/**
 * Metadata + ownership record for an object held in S3-compatible storage
 * (MASTER_SPEC §22). The entity never carries the file's bytes — only the
 * `storageKey` FileStoragePort needs to fetch/sign/delete them. Soft-deleted
 * via `markDeleted`, and later hard-purged from storage via `markPurged`
 * once `PurgeDeletedFilesUseCase` has actually deleted the S3 object — the
 * metadata row itself is kept (not hard-deleted) so audit entries
 * referencing this file's id keep resolving to a real row.
 */
export class FileObject {
  private constructor(private readonly props: FileObjectProps) {}

  static create(props: FileObjectProps): FileObject {
    const originalFilename = props.originalFilename.trim();
    const contentType = props.contentType.trim();
    const storageKey = props.storageKey.trim();
    if (!originalFilename) throw new Error("File original filename is required.");
    if (!contentType) throw new Error("File content type is required.");
    if (!storageKey) throw new Error("File storage key is required.");
    if (props.sizeBytes <= 0n) throw new Error("File size must be greater than zero bytes.");
    if (props.companyId && !props.tenantId) {
      throw new Error("A file scoped to a company must also carry a tenantId.");
    }
    return new FileObject({ ...props, originalFilename, contentType, storageKey });
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get companyId(): string | null {
    return this.props.companyId;
  }

  get ownerUserId(): string {
    return this.props.ownerUserId;
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get originalFilename(): string {
    return this.props.originalFilename;
  }

  get contentType(): string {
    return this.props.contentType;
  }

  get sizeBytes(): bigint {
    return this.props.sizeBytes;
  }

  get status(): FileObjectStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get purgedAt(): Date | null {
    return this.props.purgedAt;
  }

  /** Idempotent: deleting an already-deleted file is a no-op, not an error. */
  markDeleted(now: Date): void {
    if (this.props.status === "DELETED") return;
    this.props.status = "DELETED";
    this.props.deletedAt = now;
  }

  /**
   * Called only after the real storage object has actually been deleted
   * (`PurgeDeletedFilesUseCase`) — this method itself has no side effect
   * beyond recording that fact, so it must never be called first.
   */
  markPurged(now: Date): void {
    if (this.props.status === "PURGED") return;
    if (this.props.status !== "DELETED") throw new FileNotDeletedError();
    this.props.status = "PURGED";
    this.props.purgedAt = now;
  }

  toProps(): Readonly<FileObjectProps> {
    return { ...this.props };
  }
}
