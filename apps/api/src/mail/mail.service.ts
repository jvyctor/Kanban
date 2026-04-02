import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException
} from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";

type InvitationEmailInput = {
  to: string;
  invitedByName: string;
  boardTitle: string;
  acceptUrl: string;
};

type WelcomeEmailInput = {
  to: string;
  displayName: string;
  appUrl: string;
};

type PasswordResetEmailInput = {
  to: string;
  displayName: string;
  resetUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailShell(content: {
  eyebrow: string;
  title: string;
  body: string;
  detailLabel?: string;
  detailValue?: string;
  buttonLabel: string;
  buttonUrl: string;
  footer: string;
}) {
  const detailBlock =
    content.detailLabel && content.detailValue
      ? `
        <tr>
          <td style="padding: 0 32px 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; background: #f3f7ff; border: 1px solid #d9e5fb; border-radius: 18px;">
              <tr>
                <td style="padding: 18px 20px;">
                  <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #6d83a5; font-family: Arial, Helvetica, sans-serif;">
                    ${escapeHtml(content.detailLabel)}
                  </div>
                  <div style="margin-top: 8px; font-size: 20px; line-height: 1.3; color: #102341; font-weight: 700; font-family: Georgia, 'Times New Roman', serif;">
                    ${escapeHtml(content.detailValue)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
      : "";

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <body style="margin: 0; padding: 0; background: #eef4fc;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; background: linear-gradient(180deg, #f7fbff 0%, #edf4fd 100%);">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; max-width: 640px; background: #fffdfd; border: 1px solid #d9e5fb; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 60px rgba(31, 72, 142, 0.10);">
                <tr>
                  <td style="padding: 28px 32px 12px; background: radial-gradient(circle at top left, rgba(47, 111, 237, 0.16), transparent 34%), #fffdfd;">
                    <div style="display: inline-block; padding: 8px 12px; border-radius: 999px; background: #ebf2ff; color: #3a64b5; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif;">
                      ${escapeHtml(content.eyebrow)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 32px 12px;">
                    <div style="font-size: 38px; line-height: 1.02; color: #102341; font-weight: 700; letter-spacing: -0.04em; font-family: Georgia, 'Times New Roman', serif;">
                      ${escapeHtml(content.title)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 28px;">
                    <div style="font-size: 16px; line-height: 1.7; color: #5f7392; font-family: Arial, Helvetica, sans-serif;">
                      ${content.body}
                    </div>
                  </td>
                </tr>
                ${detailBlock}
                <tr>
                  <td style="padding: 0 32px 28px;">
                    <a href="${escapeHtml(content.buttonUrl)}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #2f6fed; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; font-family: Arial, Helvetica, sans-serif;">
                      ${escapeHtml(content.buttonLabel)}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 32px;">
                    <div style="font-size: 13px; line-height: 1.7; color: #7b8da8; font-family: Arial, Helvetica, sans-serif;">
                      ${content.footer}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  async sendBoardInvitation(input: InvitationEmailInput) {
    const from = process.env.SMTP_FROM;

    if (!from) {
      throw new ServiceUnavailableException("SMTP_FROM is not configured");
    }

    const transporter = this.getTransporter();
    const invitationHtml = buildEmailShell({
      eyebrow: "Convite de acesso",
      title: "Voce recebeu um novo convite",
      body: `
        <p style="margin: 0 0 14px;"><strong>${escapeHtml(input.invitedByName)}</strong> convidou voce para participar de um quadro compartilhado.</p>
        <p style="margin: 0;">Ao aceitar, esse quadro passa a aparecer no seu workspace e voce pode acompanhar o fluxo junto com o restante da equipe.</p>
      `,
      detailLabel: "Quadro",
      detailValue: input.boardTitle,
      buttonLabel: "Aceitar convite",
      buttonUrl: input.acceptUrl,
      footer: `
        Este convite esta vinculado ao email <strong>${escapeHtml(input.to)}</strong>.<br />
        Se o botao acima nao abrir, copie e cole este link no navegador:<br />
        <span style="word-break: break-all; color: #2f6fed;">${escapeHtml(input.acceptUrl)}</span>
      `
    });

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: `Convite para entrar no board ${input.boardTitle}`,
        text: [
          `Ola,`,
          ``,
          `${input.invitedByName} convidou voce para entrar no board "${input.boardTitle}".`,
          `Clique no link para aceitar o convite: ${input.acceptUrl}`,
          ``,
          `Esse convite exige que voce entre com a conta ${input.to}.`
        ].join("\n"),
        html: invitationHtml
      });
    } catch (error) {
      this.logger.error("Failed to send invitation email", error);
      throw new InternalServerErrorException("Failed to send invitation email");
    }
  }

  async sendWelcomeEmail(input: WelcomeEmailInput) {
    const from = process.env.SMTP_FROM;

    if (!from) {
      throw new ServiceUnavailableException("SMTP_FROM is not configured");
    }

    const transporter = this.getTransporter();
    const welcomeHtml = buildEmailShell({
      eyebrow: "Boas-vindas",
      title: `Ola, ${input.displayName}`,
      body: `
        <p style="margin: 0 0 14px;">Sua conta foi criada com sucesso e o seu workspace ja esta pronto.</p>
        <p style="margin: 0;">Agora voce pode entrar, organizar tarefas, convidar pessoas e acompanhar tudo em um fluxo claro.</p>
      `,
      buttonLabel: "Abrir plataforma",
      buttonUrl: input.appUrl,
      footer: `
        Quando quiser acessar, use este endereco:<br />
        <span style="word-break: break-all; color: #2f6fed;">${escapeHtml(input.appUrl)}</span>
      `
    });

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: "Bem-vindo a plataforma",
        text: [
          `Ola, ${input.displayName}.`,
          ``,
          `Sua conta foi criada com sucesso.`,
          `Seu workspace ja esta pronto para uso em: ${input.appUrl}`,
          ``,
          `Bem-vindo a plataforma.`
        ].join("\n"),
        html: welcomeHtml
      });
    } catch (error) {
      this.logger.error("Failed to send welcome email", error);
      throw new InternalServerErrorException("Failed to send welcome email");
    }
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput) {
    const from = process.env.SMTP_FROM;

    if (!from) {
      throw new ServiceUnavailableException("SMTP_FROM is not configured");
    }

    const transporter = this.getTransporter();
    const resetHtml = buildEmailShell({
      eyebrow: "Recuperacao de acesso",
      title: "Redefina sua senha",
      body: `
        <p style="margin: 0 0 14px;">Recebemos um pedido para redefinir a senha da conta de <strong>${escapeHtml(input.displayName)}</strong>.</p>
        <p style="margin: 0;">Use o botao abaixo para criar uma nova senha com seguranca. Se voce nao solicitou isso, pode ignorar este email.</p>
      `,
      buttonLabel: "Criar nova senha",
      buttonUrl: input.resetUrl,
      footer: `
        Este link expira em pouco tempo por seguranca.<br />
        Se o botao nao abrir, copie e cole este endereco no navegador:<br />
        <span style="word-break: break-all; color: #2f6fed;">${escapeHtml(input.resetUrl)}</span>
      `
    });

    try {
      await transporter.sendMail({
        from,
        to: input.to,
        subject: "Recuperacao de senha",
        text: [
          `Ola, ${input.displayName}.`,
          ``,
          `Recebemos um pedido para redefinir sua senha.`,
          `Use este link para criar uma nova senha: ${input.resetUrl}`,
          ``,
          `Se voce nao solicitou a alteracao, ignore este email.`
        ].join("\n"),
        html: resetHtml
      });
    } catch (error) {
      this.logger.error("Failed to send password reset email", error);
      throw new InternalServerErrorException("Failed to send password reset email");
    }
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? "0");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
      throw new ServiceUnavailableException("SMTP configuration is incomplete");
    }

    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    return this.transporter;
  }
}
