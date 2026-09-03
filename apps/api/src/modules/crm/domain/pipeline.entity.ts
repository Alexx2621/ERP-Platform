export type MasterDataStatus = "ACTIVE" | "INACTIVE";

export interface PipelineProps {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  status: MasterDataStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A named, configurable pipeline (docs/ROADMAP.md §13 exit criterion — "pipeline configurable"). Its stages are a separate entity (`PipelineStage`), not a JSON array, so an `Opportunity` can reference one by a stable id. */
export class Pipeline {
  private constructor(private readonly props: PipelineProps) {}

  static create(props: PipelineProps): Pipeline {
    const code = props.code.trim();
    const name = props.name.trim();
    if (!code) throw new Error("Pipeline code is required.");
    if (!name) throw new Error("Pipeline name is required.");
    return new Pipeline({ ...props, code, name });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get companyId(): string {
    return this.props.companyId;
  }
  get code(): string {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get status(): MasterDataStatus {
    return this.props.status;
  }
  get version(): number {
    return this.props.version;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rename(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Pipeline name is required.");
    this.props.name = trimmed;
    this.bump();
  }

  setStatus(status: MasterDataStatus): void {
    if (this.props.status === status) return;
    this.props.status = status;
    this.bump();
  }

  toProps(): Readonly<PipelineProps> {
    return { ...this.props };
  }

  private bump(): void {
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}
