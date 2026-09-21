import { logger } from "../../utils/logger";

export interface EmailProvider {
  sendVerificationEmail(params: {
    to: string;
    code: string;
    expiresAt: Date;
  }): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async sendVerificationEmail(params: {
    to: string;
    code: string;
    expiresAt: Date;
  }): Promise<void> {
    console.log(`[Email] Send verification email to ${params.to}`);
    console.log(`[Email] Code: ${params.code}`);
    console.log(`[Email] Expires: 10 minutes`);
  }
}

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from?: string) {
    this.apiKey = apiKey;
    this.from = from || "Merit Circle <onboarding@resend.dev>";
  }

  async sendVerificationEmail(params: {
    to: string;
    code: string;
    expiresAt: Date;
  }): Promise<void> {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0d1117; color: #e6edf3; border-radius: 12px; border: 1px solid #30363d;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #58a6ff; font-size: 24px; margin: 0 0 8px;">Merit Circle</h1>
          <p style="color: #8b949e; font-size: 14px; margin: 0;">Build merit. Unlock liquidity.</p>
        </div>
        <div style="background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="color: #c9d1d9; font-size: 14px; margin: 0 0 16px;">Your verification code is:</p>
          <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #58a6ff; font-family: monospace;">
            ${params.code}
          </div>
          <p style="color: #8b949e; font-size: 12px; margin: 16px 0 0;">Valid for 10 minutes</p>
        </div>
        <p style="color: #8b949e; font-size: 13px; line-height: 1.6; margin: 0 0 16px;">
          Use this code to verify your email address on Merit Circle and claim your <strong>+40 reputation points</strong> to unlock ROSCA arisan pool participation.
        </p>
        <p style="color: #6e7681; font-size: 12px; margin: 24px 0 0; text-align: center; border-top: 1px solid #21262d; padding-top: 16px;">
          If you did not request this code, please disregard this email.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [params.to],
        subject: `Your Merit Circle Verification Code: ${params.code}`,
        html,
      }),
    });

    if (!res.ok) {
      const errorBody = (await res.json().catch(() => ({}))) as any;
      const errorMsg =
        errorBody?.message ||
        `Resend API request failed with HTTP ${res.status}`;
      logger.error(`[Resend] Failed to send email to ${params.to}: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    logger.info(`[Resend] Verification email successfully sent to ${params.to}`);
  }
}

export class DelegatingEmailProvider implements EmailProvider {
  async sendVerificationEmail(params: {
    to: string;
    code: string;
    expiresAt: Date;
  }): Promise<void> {
    if (process.env.NODE_ENV === "test") {
      const consoleProvider = new ConsoleEmailProvider();
      return consoleProvider.sendVerificationEmail(params);
    }

    const providerType = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
    if (providerType === "resend") {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey && apiKey.trim()) {
        const resendProvider = new ResendEmailProvider(
          apiKey.trim(),
          process.env.EMAIL_FROM?.trim()
        );
        return resendProvider.sendVerificationEmail(params);
      }
      logger.warn(
        "[Email] EMAIL_PROVIDER is set to 'resend' but RESEND_API_KEY is not set. Falling back to ConsoleEmailProvider."
      );
    }

    const consoleProvider = new ConsoleEmailProvider();
    return consoleProvider.sendVerificationEmail(params);
  }
}

export const emailProvider: EmailProvider = new DelegatingEmailProvider();
