import { Injectable } from "@nestjs/common";
import type { User as PrismaUser } from "@erp/database";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { User } from "../domain/user.entity";
import { UserRepository } from "../domain/user.repository";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(normalizedEmail: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(limit: number): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(user: User): Promise<void> {
    const props = user.toProps();
    await this.prisma.user.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        email: props.email,
        displayName: props.displayName,
        status: props.status,
        isPlatformAdmin: props.isPlatformAdmin,
        createdAt: props.createdAt,
      },
      update: {
        displayName: props.displayName,
        status: props.status,
        isPlatformAdmin: props.isPlatformAdmin,
      },
    });
  }

  private toDomain(record: PrismaUser): User {
    return User.create({
      id: record.id,
      email: record.email,
      displayName: record.displayName,
      status: record.status,
      isPlatformAdmin: record.isPlatformAdmin,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
