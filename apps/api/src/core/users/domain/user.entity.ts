export type UserStatus = "ACTIVE" | "DISABLED";

export interface UserProps {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  /** Grants access to `/api/v1/platform/*` (docs/DECISIONS.md ADR-007). Never settable at registration. */
  isPlatformAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Global authentication identity (docs/MULTITENANCY.md §4.8). Not tenant-scoped. */
export class User {
  private constructor(private props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get isPlatformAdmin(): boolean {
    return this.props.isPlatformAdmin;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isActive(): boolean {
    return this.props.status === "ACTIVE";
  }

  disable(): void {
    this.props.status = "DISABLED";
  }

  enable(): void {
    this.props.status = "ACTIVE";
  }

  toProps(): Readonly<UserProps> {
    return { ...this.props };
  }
}
