import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import { transporter } from "@/config/emailTransporter";
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
    const partialFiles = fs.readdirSync(partialsDir);

    partialFiles.forEach((file) => {
      const partialPath = path.join(partialsDir, file);
      const partialName = path.basename(file, ".hbs");
      const partialContent = fs.readFileSync(partialPath, "utf8");
      handlebars.registerPartial(partialName, partialContent);
    });

    const templatePath = path.join(baseDir, `${templateName}.hbs`);
    const source = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(source);

    const html = template({
      ...variables,
      appName: variables.appName || "Blogify",
      logoUrl: variables.logoUrl || "https://yourapp.com/logo.png",
      websiteUrl:
        variables.websiteUrl || "https://technewsfeed-backend.onrender.com",
      unsubscribeUrl:
        variables.unsubscribeUrl || "https://yourapp.com/unsubscribe",
      year: new Date().getFullYear(),
    });

    await transporter.sendMail({
      from: `"${variables.appName || "Blogify"}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
