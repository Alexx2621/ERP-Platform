import { Injectable } from "@nestjs/common";
import type { Session as PrismaSession } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { Session } from "../domain/session.entity";
import { SessionRepository } from "../domain/session.repository";

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Session | null> {
    const record = await this.prisma.session.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByAccessTokenHash(hash: string): Promise<Session | null> {
    const record = await this.prisma.session.findUnique({ where: { accessTokenHash: hash } });
    return record ? this.toDomain(record) : null;
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    const record = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    return record ? this.toDomain(record) : null;
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const records = await this.prisma.session.findMany({
      where: { userId, status: "ACTIVE" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(session: Session): Promise<void> {
    const props = session.toProps();
    await this.prisma.session.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        userId: props.userId,
        accessTokenHash: props.accessTokenHash,
        refreshTokenHash: props.refreshTokenHash,
        status: props.status,
        accessExpiresAt: props.accessExpiresAt,
        refreshExpiresAt: props.refreshExpiresAt,
        revokedAt: props.revokedAt,
        lastUsedAt: props.lastUsedAt,
        ipAddress: props.ipAddress,
        userAgent: props.userAgent,
        createdAt: props.createdAt,
      },
      update: {
        accessTokenHash: props.accessTokenHash,
        refreshTokenHash: props.refreshTokenHash,
        status: props.status,
        accessExpiresAt: props.accessExpiresAt,
        refreshExpiresAt: props.refreshExpiresAt,
        revokedAt: props.revokedAt,
        lastUsedAt: props.lastUsedAt,
      },
    });
  }

  private toDomain(record: PrismaSession): Session {
    return Session.create({
      id: record.id,
      userId: record.userId,
      accessTokenHash: record.accessTokenHash,
      refreshTokenHash: record.refreshTokenHash,
      status: record.status,
      accessExpiresAt: record.accessExpiresAt,
      refreshExpiresAt: record.refreshExpiresAt,
      revokedAt: record.revokedAt,
      lastUsedAt: record.lastUsedAt,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
    });
  }
}
