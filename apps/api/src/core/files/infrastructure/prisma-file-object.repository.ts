import { Injectable } from "@nestjs/common";
import type { FileObject as PrismaFileObject } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { FileObject } from "../domain/file-object.entity";
import { FileObjectRepository, FindFilesQuery } from "../domain/file-object.repository";

@Injectable()
export class PrismaFileObjectRepository implements FileObjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(file: FileObject): Promise<void> {
    const props = file.toProps();
    await this.prisma.fileObject.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        tenantId: props.tenantId,
        companyId: props.companyId,
        ownerUserId: props.ownerUserId,
        storageKey: props.storageKey,
        originalFilename: props.originalFilename,
        contentType: props.contentType,
        sizeBytes: props.sizeBytes,
        status: props.status,
        createdAt: props.createdAt,
        deletedAt: props.deletedAt,
      },
      update: {
        status: props.status,
        deletedAt: props.deletedAt,
      },
    });
  }

  async findById(id: string): Promise<FileObject | null> {
    const record = await this.prisma.fileObject.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByTenant(query: FindFilesQuery): Promise<FileObject[]> {
    const records = await this.prisma.fileObject.findMany({
      where: {
        tenantId: query.tenantId,
        ...(query.companyId !== undefined ? { companyId: query.companyId } : {}),
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaFileObject): FileObject {
    return FileObject.create({
      id: record.id,
      tenantId: record.tenantId,
      companyId: record.companyId,
      ownerUserId: record.ownerUserId,
      storageKey: record.storageKey,
      originalFilename: record.originalFilename,
      contentType: record.contentType,
      sizeBytes: record.sizeBytes,
      status: record.status,
      createdAt: record.createdAt,
      deletedAt: record.deletedAt,
    });
  }
}
