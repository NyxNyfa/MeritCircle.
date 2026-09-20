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

export const emailProvider: EmailProvider = new ConsoleEmailProvider();
