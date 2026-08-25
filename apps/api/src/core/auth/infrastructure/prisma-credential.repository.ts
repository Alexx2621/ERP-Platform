import { Injectable } from "@nestjs/common";
import type { UserCredential as PrismaUserCredential } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Credential } from "../domain/credential.entity";
import { CredentialRepository } from "../domain/credential.repository";

@Injectable()
export class PrismaCredentialRepository implements CredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<Credential | null> {
    const record = await this.prisma.userCredential.findUnique({ where: { userId } });
    return record ? this.toDomain(record) : null;
  }

  async save(credential: Credential): Promise<void> {
    const props = credential.toProps();
    await this.prisma.userCredential.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        userId: props.userId,
        passwordHash: props.passwordHash,
        createdAt: props.createdAt,
      },
      update: {
        passwordHash: props.passwordHash,
      },
    });
  }

  private toDomain(record: PrismaUserCredential): Credential {
    return Credential.create({
      id: record.id,
      userId: record.userId,
      passwordHash: record.passwordHash,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
