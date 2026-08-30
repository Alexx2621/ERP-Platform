import nodemailer, { type Transporter } from "nodemailer";
import type { EmailDispatcherPort, SendEmailInput } from "../application/ports/email-dispatcher.port";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  fromAddress: string;
}

/**
 * The only real `EmailDispatcherPort` implementation. SMTP works against any
 * provider (Gmail, SendGrid, Mailgun, Postmark, AWS SES's SMTP interface, a
 * local Mailhog/Mailpit for dev) without this package picking a vendor SDK —
 * same reasoning as `S3FileStoragePort`/`S3FileStorageAdapter` for Files.
 */
export class SmtpEmailDispatcher implements EmailDispatcherPort {
  private readonly transport: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.transport.sendMail({
      from: this.config.fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.body,
    });
  }
}
