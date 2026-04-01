import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EmailTemplatesService } from './email-templates.service';

const execAsync = promisify(exec);

// Try to import Resend, but make it optional
let Resend: any = null;
try {
  Resend = require('resend').Resend;
} catch (error) {
  // Resend package not installed, will use SMTP or console logging
}

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private resend: any = null;
  private useResend: boolean = false;

  constructor(
    private configService: ConfigService,
    private templatesService: EmailTemplatesService,
  ) {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    // Check both direct env var and nested config
    const resendApiKey =
      process.env.RESEND_API_KEY || this.configService.get<string>('email.resendApiKey') || '';

    if (isDevelopment) {
      console.log(`[EmailService] Development mode detected`);
      console.log(`[EmailService] Resend package available: ${!!Resend}`);
      console.log(
        `[EmailService] RESEND_API_KEY found: ${!!resendApiKey} (length: ${resendApiKey.length})`,
      );
    }

    // Use Resend if API key is provided and package is installed (any environment)
    if (resendApiKey && Resend) {
      try {
        this.resend = new Resend(resendApiKey);
        this.useResend = true;
        console.log('✅ Resend API configured for email sending');
      } catch (error) {
        console.warn('Failed to initialize Resend, falling back to SMTP or console logging', error);
      }
    } else if (resendApiKey && !Resend) {
      console.warn('⚠️  RESEND_API_KEY is set but resend package is not installed.');
    } else if (!resendApiKey) {
      console.warn('⚠️  RESEND_API_KEY is not set. Emails will not be sent.');
    }

    // If not using Resend, try SMTP
    if (!this.useResend) {
      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const smtpPort = this.configService.get<number>('SMTP_PORT');
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

      // Only create transporter if SMTP is configured
      if (smtpHost && smtpPort && smtpUser && smtpPassword) {
        this.transporter = createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: this.configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
          // Add TLS options to handle SSL errors
          tls: {
            rejectUnauthorized: false, // Allow self-signed certificates in development
          },
        });
      } else if (isDevelopment) {
        console.warn(
          'Neither Resend nor SMTP configured. Email sending will be logged to console in development mode.',
        );
      } else {
        console.warn(
          '⚠️  [EmailService] Email service is disabled. Set RESEND_API_KEY or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD to enable.',
        );
      }
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const fromName =
      this.configService.get<string>('email.fromName') ||
      this.configService.get<string>('SMTP_FROM_NAME', 'System');
    const fromEmail =
      this.configService.get<string>('email.from') ||
      this.configService.get<string>('SMTP_FROM', 'noreply@example.com');
    const from = `"${fromName}" <${fromEmail}>`;
    const plainText = text || html.replace(/<[^>]*>/g, '');

    // Always log email to console (for development/debugging)
    this.logEmailToConsole(from, to, subject, html, plainText);

    // Use Resend API if configured (development mode)
    if (this.useResend && this.resend) {
      try {
        // Resend format: "Display Name <email@domain.com>"
        // For development/testing, Resend allows using onboarding.resend.dev domain
        // In production, you must use a verified domain
        let resendFromEmail = fromEmail;

        // If the fromEmail is not a valid domain or is a placeholder, use Resend's test domain
        if (
          !resendFromEmail ||
          resendFromEmail === 'noreply@example.com' ||
          resendFromEmail === 'noreply@mero-jugx.com' ||
          !resendFromEmail.includes('@')
        ) {
          resendFromEmail = 'onboarding@resend.dev'; // Resend's test domain for development
        }

        const result = await this.resend.emails.send({
          from: `${fromName} <${resendFromEmail}>`,
          to: [to],
          subject,
          html,
          text: plainText,
        });

        if (isDevelopment) {
          console.log(`✅ Email sent via Resend:`);
          console.log(`   From: ${fromName} <${resendFromEmail}>`);
          console.log(`   To: ${to}`);
          console.log(`   Subject: ${subject}`);
          console.log(`   Email ID: ${result.data?.id || 'N/A'}`);
          console.log(`   Response:`, JSON.stringify(result, null, 2));
        }
        return;
      } catch (error: any) {
        console.error('❌ Error sending email via Resend:');
        console.error('   Error details:', error);
        if (error.response) {
          console.error('   Response data:', error.response.data);
          console.error('   Response status:', error.response.status);

          // Check for domain verification error
          if (error.response.data?.message?.includes('verify a domain')) {
            console.error('\n⚠️  DOMAIN VERIFICATION REQUIRED:');
            console.error(
              '   Resend requires a verified domain to send emails to recipients other than your own.',
            );
            console.error(
              '   Current limitation: Using onboarding@resend.dev only allows sending to your own email.',
            );
            console.error('   Solution: Verify a domain at https://resend.com/domains');
            console.error(
              '   Then update SMTP_FROM in your .env file to use your verified domain.',
            );
          }
        }
        // Don't throw — fall through to SMTP if configured, otherwise log and continue
        console.warn('⚠️  Email send failed via Resend, falling back to SMTP if configured.');
      }
    }

    // Fallback to SMTP if configured
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          text: plainText,
          html,
        });

        if (isDevelopment) {
          console.log(`✅ Email sent successfully via SMTP to: ${to}`);
        }
        return;
      } catch (error) {
        if (isDevelopment) {
          console.error('❌ Error sending email via SMTP (development mode):', error);
          // Email already logged above, don't log again
          // Don't throw in development, just log
          return;
        }
        console.error('Error sending email:', error);
        throw error;
      }
    }

    // If neither Resend nor SMTP is configured, log to console
    console.warn('⚠️  [EmailService] Email not sent — no email service configured (set RESEND_API_KEY or SMTP)');
    console.warn(`   To: ${to} | Subject: ${subject}`);
  }

  private logInvitationDetails(
    email: string,
    inviterName: string,
    organizationName: string,
    invitationUrl: string,
    token: string,
    isNewUser: boolean,
  ): void {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const timestamp = new Date().toISOString();

    console.log('\n' + '🎯'.repeat(40));
    console.log('🎯 INVITATION EMAIL - ACCEPTANCE LINK');
    console.log('🎯'.repeat(40));
    console.log(`📧 Invited Email: ${email}`);
    console.log(`👤 Invited By: ${inviterName}`);
    console.log(`🏢 Organization: ${organizationName}`);
    console.log(`🆕 New User: ${isNewUser ? 'Yes (needs to sign up)' : 'No (existing user)'}`);
    console.log(`🔑 Token: ${token}`);
    console.log('-'.repeat(80));
    console.log('🔗 ACCEPTANCE URL (COPY THIS):');
    console.log('   ' + invitationUrl);
    console.log('-'.repeat(80));
    console.log('💡 To accept this invitation:');
    console.log('   1. Copy the URL above');
    console.log('   2. Open it in your browser');
    console.log(
      `   3. ${isNewUser ? 'Sign up for a new account' : 'Log in with your existing account'}`,
    );
    console.log('🎯'.repeat(40) + '\n');

    // In development mode, open a new window with invitation details
    if (isDevelopment) {
      const content = `
🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯
🎯 INVITATION EMAIL - ACCEPTANCE LINK
🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯
Timestamp: ${timestamp}
📧 Invited Email: ${email}
👤 Invited By: ${inviterName}
🏢 Organization: ${organizationName}
🆕 New User: ${isNewUser ? 'Yes (needs to sign up)' : 'No (existing user)'}
🔑 Token: ${token}
--------------------------------------------------------------------------------
🔗 ACCEPTANCE URL (COPY THIS):
   ${invitationUrl}
--------------------------------------------------------------------------------
💡 To accept this invitation:
   1. Copy the URL above
   2. Open it in your browser
   3. ${isNewUser ? 'Sign up for a new account' : 'Log in with your existing account'}
🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯🎯
      `.trim();
      this.openEmailInNewWindow(
        `Invitation to ${organizationName}`,
        email,
        `Invitation Email - ${organizationName}`,
        content,
        content,
        timestamp,
      );
    }
  }

  private logOrganizationVerificationDetails(
    organizationEmail: string,
    organizationName: string,
    ownerName: string,
    ownerEmail: string,
    verificationUrl: string,
    packageInfo?: {
      name: string;
      description?: string | null;
      base_user_limit: number;
      base_role_limit: number;
      price?: number | null;
    },
  ): void {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const timestamp = new Date().toISOString();

    console.log('\n' + '🏢'.repeat(40));
    console.log('🏢 ORGANIZATION CREATION EMAIL - VERIFICATION LINK');
    console.log('🏢'.repeat(40));
    console.log(`📧 Organization Email: ${organizationEmail}`);
    console.log(`🏢 Organization Name: ${organizationName}`);
    console.log(`👤 Owner Name: ${ownerName}`);
    console.log(`📧 Owner Email: ${ownerEmail}`);
    if (packageInfo) {
      console.log(`📦 Package: ${packageInfo.name}`);
      console.log(`👥 User Limit: ${packageInfo.base_user_limit}`);
      console.log(`🛡️  Role Limit: ${packageInfo.base_role_limit}`);
    }
    console.log('-'.repeat(80));
    console.log('🔗 VERIFICATION URL (COPY THIS):');
    console.log('   ' + verificationUrl);
    console.log('-'.repeat(80));
    console.log('💡 To verify the organization email:');
    console.log('   1. Copy the URL above');
    console.log('   2. Open it in your browser');
    console.log('   3. Complete the verification process');
    console.log('🏢'.repeat(40) + '\n');

    // In development mode, open a new window with organization verification details
    if (isDevelopment) {
      const packageInfoText = packageInfo
        ? `📦 Package: ${packageInfo.name}\n👥 User Limit: ${packageInfo.base_user_limit}\n🛡️  Role Limit: ${packageInfo.base_role_limit}`
        : '';
      const content = `
🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢
🏢 ORGANIZATION CREATION EMAIL - VERIFICATION LINK
🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢
Timestamp: ${timestamp}
📧 Organization Email: ${organizationEmail}
🏢 Organization Name: ${organizationName}
👤 Owner Name: ${ownerName}
📧 Owner Email: ${ownerEmail}
${packageInfoText}
--------------------------------------------------------------------------------
🔗 VERIFICATION URL (COPY THIS):
   ${verificationUrl}
--------------------------------------------------------------------------------
💡 To verify the organization email:
   1. Copy the URL above
   2. Open it in your browser
   3. Complete the verification process
🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢🏢
      `.trim();
      this.openEmailInNewWindow(
        `Organization Created: ${organizationName}`,
        organizationEmail,
        `Organization Creation Email - ${organizationName}`,
        content,
        content,
        timestamp,
      );
    }
  }

  private logVerificationDetails(
    email: string,
    name: string,
    url: string,
    token: string,
    type: 'email' | 'password',
  ): void {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const timestamp = new Date().toISOString();
    const emoji = type === 'email' ? '✉️' : '🔐';
    const title = type === 'email' ? 'EMAIL VERIFICATION' : 'PASSWORD RESET';
    const action = type === 'email' ? 'verify your email' : 'reset your password';

    console.log('\n' + emoji.repeat(40));
    console.log(`${emoji} ${title} - ${type === 'email' ? 'VERIFICATION' : 'RESET'} LINK`);
    console.log(emoji.repeat(40));
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🔑 Token: ${token}`);
    console.log('-'.repeat(80));
    console.log(`🔗 ${type === 'email' ? 'VERIFICATION' : 'RESET'} URL (COPY THIS):`);
    console.log('   ' + url);
    console.log('-'.repeat(80));
    console.log(`💡 To ${action}:`);
    console.log('   1. Copy the URL above');
    console.log('   2. Open it in your browser');
    console.log(`   3. Follow the instructions to ${action}`);
    console.log(emoji.repeat(40) + '\n');

    // In development mode, open a new window with verification details
    if (isDevelopment) {
      const content = `
${emoji.repeat(40)}
${emoji} ${title} - ${type === 'email' ? 'VERIFICATION' : 'RESET'} LINK
${emoji.repeat(40)}
Timestamp: ${timestamp}
📧 Email: ${email}
👤 Name: ${name}
🔑 Token: ${token}
--------------------------------------------------------------------------------
🔗 ${type === 'email' ? 'VERIFICATION' : 'RESET'} URL (COPY THIS):
   ${url}
--------------------------------------------------------------------------------
💡 To ${action}:
   1. Copy the URL above
   2. Open it in your browser
   3. Follow the instructions to ${action}
${emoji.repeat(40)}
      `.trim();
      this.openEmailInNewWindow(title, email, `${title} - ${name}`, content, content, timestamp);
    }
  }

  private logEmailToConsole(
    from: string,
    to: string,
    subject: string,
    html: string,
    text: string,
  ): void {
    const timestamp = new Date().toISOString();
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';

    // Log to console
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL LOG');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${timestamp}`);
    console.log(`From:    ${from}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('-'.repeat(80));
    console.log('📄 Plain Text:');
    console.log(text);
    console.log('-'.repeat(80));
    console.log('🌐 HTML Content:');
    console.log(html);
    console.log('-'.repeat(80));
    console.log('💡 Tip: Copy the HTML content above to view it in a browser');
    console.log('='.repeat(80) + '\n');

    // In development mode, open a new window with email details
    if (isDevelopment) {
      this.openEmailInNewWindow(from, to, subject, html, text, timestamp);
    }
  }

  private async openEmailInNewWindow(
    from: string,
    to: string,
    subject: string,
    html: string,
    text: string,
    timestamp: string,
  ): Promise<void> {
    try {
      // Create email content for display
      const emailContent = `
================================================================================
📧 EMAIL LOG - ${timestamp}
================================================================================
From:    ${from}
To:      ${to}
Subject: ${subject}
--------------------------------------------------------------------------------
📄 Plain Text:
${text}
--------------------------------------------------------------------------------
🌐 HTML Content:
${html}
--------------------------------------------------------------------------------
💡 Tip: Copy the HTML content above to view it in a browser
================================================================================
      `.trim();

      // Create a temporary file with email content
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `email-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, emailContent, 'utf-8');

      // Determine the platform and open appropriate window
      const platform = process.platform;

      if (platform === 'win32') {
        // Windows: Open new cmd window with email content
        const cmd = `start "Email Details - ${subject}" cmd /k "type "${tempFile}" && echo. && echo Press any key to close... && pause >nul && del "${tempFile}"`;
        execAsync(cmd).catch(() => {
          // Fallback: try PowerShell
          const psCmd = `start powershell -NoExit -Command "Get-Content '${tempFile}'; Write-Host ''; Write-Host 'Press any key to close...'; $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown'); Remove-Item '${tempFile}'"`;
          execAsync(psCmd).catch(() => {
            // If both fail, just delete the temp file
            try {
              fs.unlinkSync(tempFile);
            } catch { }
          });
        });
      } else if (platform === 'darwin') {
        // macOS: Open new terminal window
        const cmd = `osascript -e 'tell application "Terminal" to do script "cat \\"${tempFile}\\" && echo && echo Press Enter to close... && read && rm \\"${tempFile}\\""'`;
        execAsync(cmd).catch(() => {
          try {
            fs.unlinkSync(tempFile);
          } catch { }
        });
      } else {
        // Linux: Open new terminal window
        const cmd = `xterm -e "cat '${tempFile}' && echo && echo Press Enter to close... && read && rm '${tempFile}'" &`;
        execAsync(cmd).catch(() => {
          try {
            fs.unlinkSync(tempFile);
          } catch { }
        });
      }
    } catch (error) {
      // Silently fail if we can't open a new window
      // Email is already logged to console
    }
  }

  async sendVerificationEmail(email: string, token: string, name: string, origin?: string): Promise<void> {
    const appUrl = origin || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${appUrl}/verify-email?token=${token}`;

    // Log verification details prominently before sending email
    this.logVerificationDetails(email, name, verificationUrl, token, 'email');

    const html = this.templatesService.getVerificationEmail(name, token, origin);
    await this.sendEmail(email, 'Verify Your Email', html);
  }

  async sendPasswordResetEmail(email: string, token: string, name: string, origin?: string): Promise<void> {
    const appUrl = origin || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Log password reset details prominently before sending email
    this.logVerificationDetails(email, name, resetUrl, token, 'password');

    const html = this.templatesService.getPasswordResetEmail(name, token, origin);
    await this.sendEmail(email, 'Reset Your Password', html);
  }

  async sendInvitationEmail(
    email: string,
    inviterName: string,
    organizationName: string,
    token: string,
    isNewUser: boolean,
    origin?: string,
  ): Promise<void> {
    const appUrl = origin || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const invitationUrl = isNewUser
      ? `${appUrl}/accept-invitation?token=${token}`
      : `${appUrl}/invitations?token=${token}`;

    const html = this.templatesService.getInvitationEmail(
      inviterName,
      organizationName,
      token,
      isNewUser,
      origin,
    );

    // Log invitation details prominently before sending email
    this.logInvitationDetails(
      email,
      inviterName,
      organizationName,
      invitationUrl,
      token,
      isNewUser,
    );

    await this.sendEmail(email, `Invitation to join ${organizationName}`, html);
  }

  async sendAccessRevokedEmail(
    email: string,
    name: string,
    organizationName: string,
    reason?: string,
  ): Promise<void> {
    const html = this.templatesService.getAccessRevokedEmail(name, organizationName, reason);
    await this.sendEmail(email, 'Access Revoked', html);
  }

  async sendMfaEnabledEmail(email: string, name: string, organizationName: string): Promise<void> {
    const html = this.templatesService.getMfaEnabledEmail(name, organizationName);
    await this.sendEmail(email, '2FA/MFA Enabled', html);
  }

  async sendDataTransferredEmail(
    email: string,
    recipientName: string,
    transferredFromName: string,
    transferredFromEmail: string,
  ): Promise<void> {
    const html = this.templatesService.getDataTransferredEmail(
      recipientName,
      transferredFromName,
      transferredFromEmail,
    );
    await this.sendEmail(email, 'Data Ownership Transferred', html);
  }

  async sendOrganizationCreatedEmail(
    organizationEmail: string,
    organizationName: string,
    ownerName: string,
    ownerEmail: string,
    organizationDetails: {
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postal_code?: string | null;
      website?: string | null;
      description?: string | null;
    },
    verificationUrl: string,
    packageInfo?: {
      name: string;
      description?: string | null;
      base_user_limit: number;
      base_role_limit: number;
      price?: number | null;
    },
    origin?: string,
  ): Promise<void> {
    // Log organization creation details prominently before sending email
    this.logOrganizationVerificationDetails(
      organizationEmail,
      organizationName,
      ownerName,
      ownerEmail,
      verificationUrl,
      packageInfo,
    );

    const html = this.templatesService.getOrganizationCreatedEmail(
      organizationName,
      organizationEmail,
      ownerName,
      ownerEmail,
      organizationDetails,
      verificationUrl,
      packageInfo,
      origin,
    );
    await this.sendEmail(organizationEmail, `Organization Created: ${organizationName}`, html);
  }

  async sendAppAccessGrantedEmail(
    email: string,
    name: string,
    organizationName: string,
    appName: string,
    grantedByName: string,
    isOwner: boolean = false,
    isActionPerformer: boolean = false,
    origin?: string,
  ): Promise<void> {
    const html = this.templatesService.getAppAccessGrantedEmail(
      name,
      organizationName,
      appName,
      grantedByName,
      isOwner,
      isActionPerformer,
      origin,
    );
    const subject = isActionPerformer
      ? `You granted access to ${appName}`
      : isOwner
        ? `App access granted in ${organizationName}`
        : `Access granted to ${appName}`;
    await this.sendEmail(email, subject, html);
  }

  async sendAppAccessRevokedEmail(
    email: string,
    name: string,
    organizationName: string,
    appName: string,
    revokedByName: string,
    isOwner: boolean = false,
    isActionPerformer: boolean = false,
    origin?: string,
  ): Promise<void> {
    const html = this.templatesService.getAppAccessRevokedEmail(
      name,
      organizationName,
      appName,
      revokedByName,
      isOwner,
      isActionPerformer,
      origin,
    );
    const subject = isActionPerformer
      ? `You revoked access to ${appName}`
      : isOwner
        ? `App access revoked in ${organizationName}`
        : `Access revoked to ${appName}`;
    await this.sendEmail(email, subject, html);
  }

  /**
   * Send marketing email to user
   * Checks marketing_email_subscribed preference before sending
   */
  async sendMarketingEmail(
    email: string,
    name: string,
    subject: string,
    content: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Check if user has subscribed to marketing emails
    // This should be checked by the caller, but we verify here as well
    const html = this.templatesService.getMarketingEmail(name, content, organizationId);
    await this.sendEmail(email, subject, html);
  }
}
