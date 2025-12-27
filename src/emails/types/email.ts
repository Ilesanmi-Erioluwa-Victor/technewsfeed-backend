export const EMAIL_TEMPLATES = {
  WELCOME: "welcome" as const,
  VERIFY_EMAIL: "verify-email" as const,
  MAGIC_LINK: "magic-link" as const,

  FORGOT_PASSWORD: "forgot-password" as const,
  PASSWORD_RESET: "password-reset" as const,
  PASSWORD_RESET_CONFIRMATION: "password-reset-confirmation" as const,

  OTP: "otp" as const,
  SECURITY_OTP: "security-otp" as const,
  TRANSACTION_OTP: "transaction-otp" as const,
  GENERIC_OTP: "generic-otp" as const,

  NOTIFICATION: "notification" as const,

  NAME_CHANGE_CONFIRMATION: "name-change-confirmation" as const,
  PROFILE_UPDATE: "profile-update" as const,

  WRITER_INVITATION: "writer-invitation" as const,

  NEWSLETTER_WELCOME: "newsletter-welcome" as const,
  NEWSLETTER_CONFIRMATION: "newsletter-confirmation" as const,
} as const;

export type EmailTemplateName =
  (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];

export interface SendEmailProps {
  to: string;
  subject: string;
  templateName: EmailTemplateName;
  variables?: Record<
    string,
    string | number | boolean | Date | null | undefined
  >;
}

export const getTemplateForPurpose = (
  purpose: "email_verification" | "security" | "transaction" | string
): EmailTemplateName => {
  switch (purpose) {
    case "email_verification":
      return EMAIL_TEMPLATES.VERIFY_EMAIL;
    case "security":
      return EMAIL_TEMPLATES.SECURITY_OTP;
    case "transaction":
      return EMAIL_TEMPLATES.TRANSACTION_OTP;
    default:
      return EMAIL_TEMPLATES.GENERIC_OTP;
  }
};
