import { Credential } from "../domain/credential.entity";
import { CredentialRepository } from "../domain/credential.repository";

export class InMemoryCredentialRepository implements CredentialRepository {
  private readonly credentialsByUserId = new Map<string, Credential>();

  async findByUserId(userId: string): Promise<Credential | null> {
    return this.credentialsByUserId.get(userId) ?? null;
  }

  async save(credential: Credential): Promise<void> {
    this.credentialsByUserId.set(credential.userId, credential);
  }
}
