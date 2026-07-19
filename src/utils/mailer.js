import nodemailer from "nodemailer";

let transporter;

// Initialize Transporter: uses custom SMTP if configured, otherwise falls back to dynamic Ethereal Mail
const getTransporter = async () => {
  if (transporter) return transporter;

  const hasSMTPConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasSMTPConfig) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log("✉️  Nodemailer: Configured using custom SMTP server.");
  } else {
    // Dynamically provision a temporary Ethereal test account (zero-setup fake SMTP sandbox)
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`✉️  Nodemailer: Ethereal test account created!`);
      console.log(`🔑 Test User: ${testAccount.user}`);
    } catch (error) {
      console.error("❌ Nodemailer failed to initialize Ethereal mail:", error);
    }
  }

  return transporter;
};

// Reusable function to send HTML emails
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const client = await getTransporter();
    if (!client) {
      console.warn("⚠️  Email skipped: Mailer client is not initialized.");
      return;
    }

    const info = await client.sendMail({
      from: `"Smart Task System" <noreply@smarttask.com>`,
      to,
      subject,
      html
    });

    console.log(`✉️  Email Sent to ${to}: MessageID: ${info.messageId}`);
    
    // Ethereal Mail provides a web panel link to view sent email mockups
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Preview Sent Email at: ${previewUrl}`);
    }

    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    throw error;
  }
};
