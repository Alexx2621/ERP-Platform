export interface UserPreferenceProps {
  id: string;
  userId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/** A personal, per-user preference (docs/ARCHITECTURE.md §8.2). No code-owned catalog — see schema.prisma's comment. */
export class UserPreference {
  private constructor(private readonly props: UserPreferenceProps) {}

  static create(props: UserPreferenceProps): UserPreference {
    const key = props.key.trim();
    if (!key) throw new Error("Preference key is required.");
    if (key.length > 150) throw new Error("Preference key cannot exceed 150 characters.");
    return new UserPreference({ ...props, key });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get key(): string {
    return this.props.key;
  }

  get value(): unknown {
    return this.props.value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<UserPreferenceProps> {
    return { ...this.props };
  }
}
