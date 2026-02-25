import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasskeyEmail(email: string, passkey: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your PulseSpend Passkey',
    html: `
      <h2>Your verification passkey is:</h2>
      <h1 style="color: #DBFF00; font-size: 32px; letter-spacing: 8px;">${passkey}</h1>
      <p>This passkey will expire in 5 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });
}
