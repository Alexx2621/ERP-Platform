export interface TenantExecutionContextProps {
  requestId: string;
  correlationId: string;
  userId: string;
  tenantId: string;
  membershipId: string;
  companyId?: string;
}

/** Immutable, backend-resolved security context passed to tenant-aware use cases. */
export class TenantExecutionContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly actor: Readonly<{ type: "USER"; userId: string }>;
  readonly tenantId: string;
  readonly membershipId: string;
  readonly companyId?: string;

  private constructor(props: TenantExecutionContextProps) {
    this.requestId = props.requestId;
    this.correlationId = props.correlationId;
    this.actor = Object.freeze({ type: "USER", userId: props.userId });
    this.tenantId = props.tenantId;
    this.membershipId = props.membershipId;
    this.companyId = props.companyId;
    Object.freeze(this);
  }

  static create(props: TenantExecutionContextProps): TenantExecutionContext {
    return new TenantExecutionContext(props);
  }
}
