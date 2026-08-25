import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { TokenGenerator } from "../application/ports/token-generator.port";

const TOKEN_BYTES = 32; // 256 bits of entropy

@Injectable()
export class CryptoTokenGenerator implements TokenGenerator {
  generateToken(): string {
    return randomBytes(TOKEN_BYTES).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
