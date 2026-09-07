import { Global, Module } from "@nestjs/common";
import { DOCUMENT_NUMBER_ALLOCATOR } from "./document-number.port";
import { DocumentNumberService } from "./document-number.service";

/** Global, same pattern as `PrismaModule` — any module that creates a
 * numbered business document can inject `DOCUMENT_NUMBER_ALLOCATOR` without
 * wiring an import chain for it. */
@Global()
@Module({
  providers: [{ provide: DOCUMENT_NUMBER_ALLOCATOR, useClass: DocumentNumberService }],
  exports: [DOCUMENT_NUMBER_ALLOCATOR],
})
export class DocumentNumberingModule {}
