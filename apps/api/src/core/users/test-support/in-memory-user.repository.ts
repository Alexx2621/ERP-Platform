import { User } from "../domain/user.entity";
import { UserRepository } from "../domain/user.repository";

export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.usersById.get(id) ?? null;
  }

  async findByEmail(normalizedEmail: string): Promise<User | null> {
    for (const user of this.usersById.values()) {
      if (user.email === normalizedEmail) return user;
    }
    return null;
  }

  async save(user: User): Promise<void> {
    this.usersById.set(user.id, user);
  }
}
