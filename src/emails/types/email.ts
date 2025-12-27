export type EmailTemplateName =
  | "welcome"
  | "forgot-password"
  | "otp"
  | "magic-link"
  | "verify"
  | "notification"
  | "password-reset-confirmation"
  | "password-reset"
  ;

export interface SendEmailProps {
  to: string;
  subject: string;
  templateName: EmailTemplateName;
  variables?: Record<string, string | number>;
}
