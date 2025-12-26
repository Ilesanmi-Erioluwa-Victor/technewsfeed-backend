import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import { gmail } from "@/config/gmailClient";
import { SendEmailProps } from "./types/email";

export const sendEmail = async ({
  to,
  subject,
  templateName,
  variables = {},
}: SendEmailProps) => {
  try {
    const baseDir =
      process.env.NODE_ENV === "production"
        ? path.resolve(__dirname, "emails", "templates")
        : path.resolve(__dirname, "../emails/templates");

    const partialsDir = path.join(baseDir, "partials");
    if (fs.existsSync(partialsDir)) {
      const partialFiles = fs.readdirSync(partialsDir);
      partialFiles.forEach((file) => {
        const partialPath = path.join(partialsDir, file);
        const partialName = path.basename(file, ".hbs");
        const partialContent = fs.readFileSync(partialPath, "utf8");
        handlebars.registerPartial(partialName, partialContent);
      });
    }

    const templatePath = path.join(baseDir, `${templateName}.hbs`);
    const source = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(source);

    const html = template({
      ...variables,
      appName: variables.appName || "TechNewsFeed",
      logoUrl: variables.logoUrl || "https://technewsfeed.com/logo.png",
      websiteUrl: variables.websiteUrl || "https://technewsfeed.com",
      unsubscribeUrl:
        variables.unsubscribeUrl || "https://technewsfeed.com/unsubscribe",
      year: new Date().getFullYear(),
    });

    const messageParts = [
      `From: "${variables.appName}" <${process.env.GMAIL_USER}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
    ];
    const message = messageParts.join("\n");
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    throw new Error(`Failed to send email: ${error}`);
  }
};
