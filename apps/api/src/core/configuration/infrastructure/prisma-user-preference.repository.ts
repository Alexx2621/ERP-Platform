import { Injectable } from "@nestjs/common";
import type { Prisma, UserPreference as PrismaUserPreference } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { UserPreference } from "../domain/user-preference.entity";
import { UserPreferenceRepository } from "../domain/user-preference.repository";

@Injectable()
export class PrismaUserPreferenceRepository implements UserPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserAndKey(userId: string, key: string): Promise<UserPreference | null> {
    const record = await this.prisma.userPreference.findUnique({
      where: { userId_key: { userId, key } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByUser(userId: string): Promise<UserPreference[]> {
    const records = await this.prisma.userPreference.findMany({
      where: { userId },
      orderBy: { key: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(preference: UserPreference): Promise<void> {
    const props = preference.toProps();
    await this.prisma.userPreference.upsert({
      where: { userId_key: { userId: props.userId, key: props.key } },
      create: {
        id: props.id,
        userId: props.userId,
        key: props.key,
        value: props.value as Prisma.InputJsonValue,
      },
      update: { value: props.value as Prisma.InputJsonValue },
    });
  }

  private toDomain(record: PrismaUserPreference): UserPreference {
    return UserPreference.create({
      id: record.id,
      userId: record.userId,
      key: record.key,
      value: record.value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
