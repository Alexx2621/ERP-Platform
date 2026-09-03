export interface PipelineStageProps {
  id: string;
  tenantId: string;
  pipelineId: string;
  name: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One configurable stage of a `Pipeline`. `isWon`/`isLost` are how
 * `MoveOpportunityStageUseCase` knows to close an `Opportunity` on arrival
 * at this stage — never both true on the same stage (a stage cannot mean
 * both outcomes at once). Reordering stages after creation is deliberately
 * not built in this slice — `AddPipelineStageUseCase` always appends at
 * the end (`sortOrder` = current stage count), the same proportionate
 * scope already accepted for `Category`'s tree not supporting a "move"
 * operation.
 */
export class PipelineStage {
  private constructor(private readonly props: PipelineStageProps) {}

  static create(props: PipelineStageProps): PipelineStage {
    const name = props.name.trim();
    if (!name) throw new Error("Pipeline stage name is required.");
    if (props.isWon && props.isLost) {
      throw new Error("A pipeline stage cannot be both won and lost.");
    }
    return new PipelineStage({ ...props, name });
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get pipelineId(): string {
    return this.props.pipelineId;
  }
  get name(): string {
    return this.props.name;
  }
  get sortOrder(): number {
    return this.props.sortOrder;
  }
  get isWon(): boolean {
    return this.props.isWon;
  }
  get isLost(): boolean {
    return this.props.isLost;
  }
  get isClosing(): boolean {
    return this.props.isWon || this.props.isLost;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<PipelineStageProps> {
    return { ...this.props };
  }
}
