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
    const partialsDir = path.resolve(__dirname, "templates", "partials");
    const partialFiles = fs.readdirSync(partialsDir);

    partialFiles.forEach((file) => {
      const partialPath = path.join(partialsDir, file);
      const partialName = path.basename(file, ".hbs");
      const partialContent = fs.readFileSync(partialPath, "utf8");
      handlebars.registerPartial(partialName, partialContent);
    });

    const templatePath = path.resolve(
      __dirname,
      "templates",
      `${templateName}.hbs`
    );
    const source = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(source);

    const html = template({
      ...variables,
      appName: variables.appName || "Blogify",
      logoUrl: variables.logoUrl || "https://yourapp.com/logo.png",
      websiteUrl: variables.websiteUrl || "https://yourapp.com",
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
