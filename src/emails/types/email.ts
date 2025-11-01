export type EmailTemplateName =
  | "welcome"
  | "forgot-password"
  | "otp"
  | "notification";

export interface SendEmailProps {
  to: string;
  subject: string;
  templateName: EmailTemplateName;
  variables?: Record<string, string | number>;
}
