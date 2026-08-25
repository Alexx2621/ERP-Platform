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

  async save(user: User): Promise<void> {
    const props = user.toProps();
    await this.prisma.user.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        email: props.email,
        displayName: props.displayName,
        status: props.status,
        createdAt: props.createdAt,
      },
      update: {
        displayName: props.displayName,
        status: props.status,
      },
    });
  }

  private toDomain(record: PrismaUser): User {
    return User.create({
      id: record.id,
      email: record.email,
      displayName: record.displayName,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
