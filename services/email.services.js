const nodemailer = require("nodemailer");
const crypto = require("crypto");

class EmailService {
  constructor() {
    // Gmail SMTP configuration (free)
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // app password (not regular password)
      },
    });
  }

  // Generate 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Send OTP email
  async sendOTP(email, otp, purpose = "verification") {
    const subject =
      purpose === "login" ? "Login OTP" : "Email Verification OTP";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email ${
          purpose === "login" ? "Login" : "Verification"
        }</h2>
        <p>Your OTP code is:</p>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #007bff;">${otp}</span>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true, message: "OTP sent successfully" };
    } catch (error) {
      console.error("Email sending failed:", error);
      throw new Error("Failed to send OTP email");
    }
  }

  // Send welcome email after verification
  async sendWelcomeEmail(email, username) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Our Platform!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Welcome ${username}!</h2>
          <p>Your email has been successfully verified.</p>
          <p>You can now enjoy all features of our platform.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Welcome email failed:", error);
      // Don't throw error for welcome email failure
    }
  }
}

module.exports = new EmailService();
