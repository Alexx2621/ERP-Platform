import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { RefreshSessionUseCase } from "../application/use-cases/refresh-session.use-case";
import { LogoutUseCase } from "../application/use-cases/logout.use-case";
import { RevokeAllSessionsUseCase } from "../application/use-cases/revoke-all-sessions.use-case";
import { RegisterUseCase } from "../application/use-cases/register.use-case";
import { AccountDisabledError, InvalidCredentialsError } from "../application/errors";
import { RecordAuditEntryUseCase } from "../../audit";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { SessionResponseDto } from "./dto/session-response.dto";
import { SessionAuthGuard } from "./session-auth.guard";
import { CurrentAuth } from "./current-user.decorator";
import { extractBearerToken } from "./extract-bearer-token";
import { handleAuthError } from "./auth-error.mapper";
import type { AuthContext } from "./auth-request";

@Controller("api/v1/auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly recordAuditEntry: RecordAuditEntryUseCase,
  ) {}

  /** MASTER_SPEC §68 "crear cuenta" step — logs the new account in immediately. */
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() request: Request): Promise<SessionResponseDto> {
    try {
      const result = await this.registerUseCase.execute({
        email: dto.email,
        password: dto.password,
        displayName: dto.displayName,
        ipAddress: request.ip,
        userAgent: request.header("user-agent"),
      });
      await this.recordAuditEntry.execute({
        userId: result.user.id,
        tenantId: null,
        action: "user.registered",
        resource: "User",
        resourceId: result.user.id,
        newValues: { email: result.user.email, displayName: result.user.displayName },
        ipAddress: request.ip,
        userAgent: request.header("user-agent"),
        correlationId: request.correlationId,
      });
      return SessionResponseDto.fromResult(result);
    } catch (error) {
      handleAuthError(error);
    }
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() request: Request): Promise<SessionResponseDto> {
    try {
      const result = await this.loginUseCase.execute({
        email: dto.email,
        password: dto.password,
        ipAddress: request.ip,
        userAgent: request.header("user-agent"),
      });
      await this.recordAuditEntry.execute({
        userId: result.user.id,
        tenantId: null,
        action: "auth.login.succeeded",
        resource: "Session",
        ipAddress: request.ip,
        userAgent: request.header("user-agent"),
        correlationId: request.correlationId,
      });
      return SessionResponseDto.fromResult(result);
    } catch (error) {
      if (error instanceof InvalidCredentialsError || error instanceof AccountDisabledError) {
        await this.recordAuditEntry.execute({
          userId: null,
          tenantId: null,
          action: "auth.login.failed",
          resource: "Session",
          newValues: { email: dto.email },
          ipAddress: request.ip,
          userAgent: request.header("user-agent"),
          correlationId: request.correlationId,
        });
      }
      handleAuthError(error);
    }
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto): Promise<SessionResponseDto> {
    try {
      const result = await this.refreshSessionUseCase.execute({ refreshToken: dto.refreshToken });
      return SessionResponseDto.fromResult(result);
    } catch (error) {
      handleAuthError(error);
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  async logout(@Req() request: Request, @CurrentAuth() auth: AuthContext): Promise<void> {
    const token = extractBearerToken(request.header("authorization"));
    try {
      // Guard already validated this token, so it is present and well-formed.
      await this.logoutUseCase.execute(token as string);
      await this.recordAuditEntry.execute({
        userId: auth.user.id,
        tenantId: null,
        action: "auth.logout",
        resource: "Session",
        ipAddress: request.ip,
        userAgent: request.header("user-agent"),
        correlationId: request.correlationId,
      });
    } catch (error) {
      handleAuthError(error);
    }
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionAuthGuard)
  async logoutAll(@CurrentAuth() auth: AuthContext, @Req() request: Request): Promise<void> {
    await this.revokeAllSessionsUseCase.execute(auth.user.id);
    await this.recordAuditEntry.execute({
      userId: auth.user.id,
      tenantId: null,
      action: "auth.sessions.revoked_all",
      resource: "Session",
      ipAddress: request.ip,
      userAgent: request.header("user-agent"),
      correlationId: request.correlationId,
    });
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  me(@CurrentAuth() auth: AuthContext): { id: string; email: string; displayName: string } {
    return { id: auth.user.id, email: auth.user.email, displayName: auth.user.displayName };
  }
}
