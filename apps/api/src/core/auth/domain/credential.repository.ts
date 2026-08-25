import { Credential } from "./credential.entity";

export interface CredentialRepository {
  findByUserId(userId: string): Promise<Credential | null>;
  save(credential: Credential): Promise<void>;
}

export const CREDENTIAL_REPOSITORY = Symbol("CREDENTIAL_REPOSITORY");
