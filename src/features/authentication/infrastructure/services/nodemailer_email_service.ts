import { EmailService } from '../../domain/interfaces/email_service';
import * as nodemailer from 'nodemailer';

export class NodemailerEmailService implements EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // We will configure the email transporter using environment variables
        // This allows you to use different email accounts for development and production
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT),
            secure: false, // true if using port 465
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false }, // dev only
        });

    }

    async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
        const mailOptions = {
            from: `"RealEnglish App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Password Reset Code',
            html: `
        <div style="font-family: sans-serif; text-align: center;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password.</p>
          <p>Use the following code to reset your password. The code is valid for 10 minutes.</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; background: #f0f0f0; padding: 10px;">
            ${otp}
          </p>
        </div>
      `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Password reset OTP sent successfully to ${email}`);
        } catch (error) {
            console.error(`Failed to send email to ${email}`, error);
            // In a real app, you might want to throw an error to let the user know something went wrong.
            throw new Error('Could not send password reset email.');
        }
    }
}