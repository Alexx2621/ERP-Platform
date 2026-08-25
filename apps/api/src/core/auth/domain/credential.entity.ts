export interface CredentialProps {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Password credential for a User (docs/ARCHITECTURE.md §8.2: `user_credentials`). */
export class Credential {
  private constructor(private props: CredentialProps) {}

  static create(props: CredentialProps): Credential {
    return new Credential(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  changePasswordHash(newHash: string): void {
    this.props.passwordHash = newHash;
  }

  toProps(): Readonly<CredentialProps> {
    return { ...this.props };
  }
}
