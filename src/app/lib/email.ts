import nodemailer from 'nodemailer';

// Define the interface for SendMailOptions
interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

// ⚠️ EMAIL CONFIGURATION - Gmail SMTP
const emailUser = 'cso@consolegal.com';
const emailPassword = 'kcnwmlxptfrrcbuo'; // Google App Password (spaces removed)

if (!emailUser || !emailPassword) {
  console.warn('WARNING: Email credentials missing');
} else {
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: emailUser,
    pass: emailPassword,
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true, // Enable SMTP debug output
  logger: true, // Log SMTP traffic to console
});

// Test email connection
export const testConnection = async () => {
  try {

    await transporter.verify();
    return true;
  } catch (error) {
    return false;
  }
};

// Send email function
export const sendMail = async ({ to, subject, html }: SendMailOptions) => {

  const result = await transporter.sendMail({
    from: `"Consolegal" <${emailUser}>`,
    to,
    subject,
    html,
  });

  return true;
};

// Generate OTP function
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};