import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AuditModule } from "./audit.module";
import { RecordAuditEntryUseCase } from "./application/use-cases/record-audit-entry.use-case";
import { ListAuditEntriesUseCase } from "./application/use-cases/list-audit-entries.use-case";
import { ListPlatformAuditEntriesUseCase } from "./application/use-cases/list-platform-audit-entries.use-case";

@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class StubInfraModule {}

describe("AuditModule wiring", () => {
  it("resolves both use cases with zero dependency on any other core module", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [StubInfraModule, AuditModule],
    }).compile();

    expect(moduleRef.get(RecordAuditEntryUseCase)).toBeInstanceOf(RecordAuditEntryUseCase);
    expect(moduleRef.get(ListAuditEntriesUseCase)).toBeInstanceOf(ListAuditEntriesUseCase);
    expect(moduleRef.get(ListPlatformAuditEntriesUseCase)).toBeInstanceOf(ListPlatformAuditEntriesUseCase);

    await moduleRef.close();
  });
});
