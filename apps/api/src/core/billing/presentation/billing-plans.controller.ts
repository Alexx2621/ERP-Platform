import { Controller, Get, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ListPlansUseCase } from "../application/use-cases/list-plans.use-case";
import { PlanResponseDto } from "./dto/plan-response.dto";

/**
 * Genuinely public, unauthenticated pricing catalog — the same kind of
 * real-world "planes y precios" page a prospective customer must be able
 * to see before signing up, with no session or tenant context available
 * yet (the same reasoning that already makes `GET /api/docs` public: the
 * data itself is not sensitive). The second genuinely public API surface
 * in this codebase, after Commerce's storefront (Phase 7A).
 */
@ApiTags("Billing")
@Controller("api/v1/billing/plans")
export class BillingPlansController {
  constructor(private readonly listPlans: ListPlansUseCase) {}

  @Get()
  @ApiOperation({ summary: "List every plan in the commercial catalog." })
  @ApiResponse({ status: HttpStatus.OK, type: [PlanResponseDto] })
  async list(): Promise<PlanResponseDto[]> {
    const plans = await this.listPlans.execute();
    return plans.map(PlanResponseDto.fromDomain);
  }
}
