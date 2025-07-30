const nodemailer = require("nodemailer");
const crypto = require("crypto");

class EmailService {
  constructor() {
    // SendGrid SMTP configuration
    this.transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 2525,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      logger: false,
      debug: false,
    });

    // Email configuration
    this.emailConfig = {
      brandName: "RoboNinjaz",
      brandTagline: "Device Management Platform",
      supportEmail: "roboninjaztest@gmail.com",
      noreplyEmail: process.env.EMAIL_USER || "noreply@roboninjaz.com",
      websiteUrl: process.env.FRONTEND_URL || "https://roboninjaz.com",
      companyAddress:
        "RoboNinjaz Inc., 123 Tech Street, Innovation City, TC 12345",
      unsubscribeUrl:
        process.env.UNSUBSCRIBE_URL || "https://roboninjaz.com/contact",
    };

    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
    } catch (error) {}
  }

  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate email headers for better deliverability
  generateEmailHeaders(priority = "normal") {
    const headers = {
      "Message-ID": `<${crypto.randomUUID()}@roboninjaz.com>`,
      Date: new Date().toUTCString(),
      "List-Unsubscribe": `<${this.emailConfig.unsubscribeUrl}>`,
      "Return-Path": this.emailConfig.noreplyEmail,
      "Reply-To": this.emailConfig.supportEmail,
      "X-Mailer": "RoboNinjaz-Platform-v1.0",
      "X-Email-Type": "transactional",
    };

    if (priority === "high") {
      headers["X-Priority"] = "1";
      headers["X-MSMail-Priority"] = "High";
      headers["Importance"] = "high";
    }

    return headers;
  }

  // Main OTP sending method
  async sendOTP(email, otp, purpose = "verification") {
    const isLogin = purpose === "login";
    const subject = isLogin
      ? `${this.emailConfig.brandName} - Login Verification Code`
      : `${this.emailConfig.brandName} - Email Verification Required`;

    const mailOptions = {
      from: {
        name: `${this.emailConfig.brandName} Security`,
        address: this.emailConfig.noreplyEmail,
      },
      to: email,
      subject: subject,
      html: this.generateOTPHTML(otp, purpose),
      text: this.generateOTPText(otp, purpose),
      headers: this.generateEmailHeaders("high"),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        message: "OTP sent successfully",
        messageId: info.messageId,
        provider: "SendGrid",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }



  // Clean HTML template for OTP
  generateOTPHTML(otp, purpose) {
    const isLogin = purpose === "login";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isLogin ? "Login" : "Email"} Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;"> ${
        this.emailConfig.brandName
      }</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${
        this.emailConfig.brandTagline
      }</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">
        ${isLogin ? "🔐 Login Verification" : "📧 Email Verification"}
      </h2>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        ${
          isLogin
            ? `To complete your login to ${this.emailConfig.brandName}, please use the verification code below:`
            : `Welcome to ${this.emailConfig.brandName}! Please use this verification code to activate your account:`
        }
      </p>
      
      <!-- OTP Box -->
      <div style="background: #f8f9ff; border: 3px dashed #007bff; padding: 30px; text-align: center; margin: 30px 0; border-radius: 12px;">
        <div style="font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: monospace; margin-bottom: 15px;">
          ${otp}
        </div>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Enter this code to ${
            isLogin ? "complete your login" : "verify your email"
          }
        </p>
      </div>
      
      <!-- Warning -->
      <div style=" padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0; color: #856404; font-size: 15px;">
           <strong>Important:</strong> This code expires in <strong>10 minutes</strong> for security.
        </p>
      </div>
      
      <!-- Security Notice -->
      <div style=" padding: 20px; margin: 25px 0;">
        <p style="margin: 0; color: #155724; font-size: 14px; line-height: 1.5;">
           <strong>Security Tip:</strong> Never share this code with anyone. ${
             this.emailConfig.brandName
           } will never ask for verification codes.
        </p>
      </div>
      
      <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
        If you didn't request this ${
          isLogin ? "login" : "verification"
        }, please ignore this email or contact support at <a href="mailto:${
      this.emailConfig.supportEmail
    }" style="color: #007bff;">${this.emailConfig.supportEmail}</a>.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: bold;">
        ${this.emailConfig.brandName}
      </p>
      <p style="margin: 0 0 15px 0; font-size: 12px; color: #888; line-height: 1.4;">
        This is an automated message. Please do not reply.<br>
        ${this.emailConfig.companyAddress}
      </p>
      <p style="margin: 0; font-size: 11px; color: #aaa;">
        © ${new Date().getFullYear()} ${
      this.emailConfig.brandName
    }. All rights reserved.<br>
        <a href="${
          this.emailConfig.unsubscribeUrl
        }" style="color: #888;">Unsubscribe</a>
      </p>
    </div>
    
  </div>
</body>
</html>`;
  }

  // Plain text version for better deliverability
  generateOTPText(otp, purpose) {
    const isLogin = purpose === "login";

    return `${this.emailConfig.brandName} - ${
      isLogin ? "Login" : "Email"
    } Verification

Hello,

${
  isLogin
    ? `To complete your login to ${this.emailConfig.brandName}, please use this verification code:`
    : `Welcome to ${this.emailConfig.brandName}! Please use this verification code to activate your account:`
}

Verification Code: ${otp}

This code will expire in 10 minutes for security reasons.

SECURITY REMINDER: Never share this code with anyone.

If you didn't request this ${
      isLogin ? "login" : "verification"
    }, please ignore this email.

Need help? Contact us at ${this.emailConfig.supportEmail}

---
${this.emailConfig.brandName}
${this.emailConfig.companyAddress}

Unsubscribe: ${this.emailConfig.unsubscribeUrl}
`;
  }

  // Welcome email method
  async sendWelcomeEmail(email, username) {
    const subject = `🎉 Welcome to ${this.emailConfig.brandName} - Account Verified!`;

    const mailOptions = {
      from: {
        name: `${this.emailConfig.brandName} Team`,
        address: this.emailConfig.noreplyEmail,
      },
      to: email,
      subject: subject,
      html: this.generateWelcomeHTML(username, email),
      text: this.generateWelcomeText(username),
      headers: this.generateEmailHeaders("normal"),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Welcome email HTML template
  generateWelcomeHTML(username, email) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${this.emailConfig.brandName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 50px 20px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 32px; font-weight: bold;">🎉 Welcome to ${
        this.emailConfig.brandName
      }!</h1>
      <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Your account is now active</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #333; margin: 0 0 25px 0; font-size: 26px;">Hello ${username}! 👋</h2>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        Congratulations! Your email has been successfully verified and your ${
          this.emailConfig.brandName
        } account is now fully active. We're excited to have you join our community!
      </p>
      
      <!-- Next Steps -->
      <div style="background: #d4edda; border: 1px solid #c3e6cb; border-left: 5px solid #28a745; padding: 25px; margin: 30px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 20px 0; color: #155724; font-size: 20px;">🚀 What's next?</h3>
        <div style="color: #155724; line-height: 1.8; font-size: 15px;">
          <p style="margin: 0 0 10px 0;"><strong>• Explore the Dashboard:</strong> Get familiar with all platform features</p>
          <p style="margin: 0 0 10px 0;"><strong>• Complete Profile:</strong> Add your details and preferences</p>
          <p style="margin: 0 0 10px 0;"><strong>• Connect Devices:</strong> Start managing your IoT devices</p>
          <p style="margin: 0 0 10px 0;"><strong>• Browse Projects:</strong> Discover exciting robotics projects</p>
          <p style="margin: 0;"><strong>• Join Community:</strong> Connect with other makers and developers</p>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="${this.emailConfig.websiteUrl}/dashboard" 
           style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 18px;">
          🎯 Access Your Dashboard
        </a>
      </div>
      
      <!-- Support -->
      <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 25px; border-radius: 8px; margin: 30px 0;">
        <h4 style="margin: 0 0 15px 0; color: #495057;">💬 Need Help?</h4>
        <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.5;">
          Our support team is here to help! If you have questions or need assistance, contact us at <a href="mailto:${
            this.emailConfig.supportEmail
          }" style="color: #007bff;">${this.emailConfig.supportEmail}</a>.
        </p>
      </div>
      
      <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
        Thank you for choosing ${
          this.emailConfig.brandName
        }. We're excited to see what amazing projects you'll create!
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: bold;">
        ${this.emailConfig.brandName} - Empowering Innovation
      </p>
      <p style="margin: 0 0 15px 0; font-size: 12px; color: #888; line-height: 1.4;">
        ${this.emailConfig.companyAddress}<br>
        This email was sent to ${email}
      </p>
      <p style="margin: 0; font-size: 11px; color: #aaa;">
        © ${new Date().getFullYear()} ${
      this.emailConfig.brandName
    }. All rights reserved.<br>
        <a href="${
          this.emailConfig.unsubscribeUrl
        }" style="color: #888;">Unsubscribe</a>
      </p>
    </div>
    
  </div>
</body>
</html>`;
  }

  // Welcome email plain text
  generateWelcomeText(username) {
    return `Welcome to ${this.emailConfig.brandName}!

Hello ${username}!

Congratulations! Your email has been successfully verified and your ${this.emailConfig.brandName} account is now fully active.

NEXT STEPS:
• Explore the Dashboard - Discover all platform features
• Complete Your Profile - Add your details and preferences  
• Connect Your Devices - Start managing your IoT devices
• Browse Projects - Find inspiration from our community
• Join Discussions - Connect with fellow makers

Access your dashboard: ${this.emailConfig.websiteUrl}/dashboard

NEED HELP?
Our support team is here to assist you. Contact us at ${this.emailConfig.supportEmail}

Thank you for choosing ${this.emailConfig.brandName}!

---
${this.emailConfig.brandName}
${this.emailConfig.companyAddress}

Unsubscribe: ${this.emailConfig.unsubscribeUrl}
`;
  }


    async sendPasswordResetOTP(email, otp) {
  const subject = `${this.emailConfig.brandName} - Password Reset Verification`;

  const mailOptions = {
    from: {
      name: `${this.emailConfig.brandName} Security`,
      address: this.emailConfig.noreplyEmail,
    },
    to: email,
    subject: subject,
    html: this.generatePasswordResetHTML(otp),
    text: this.generatePasswordResetText(otp),
    headers: this.generateEmailHeaders("high"),
  };

  try {
    const info = await this.transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Password reset OTP sent successfully",
      messageId: info.messageId,
      provider: "SendGrid",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
  
generatePasswordResetHTML(otp) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px 20px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${this.emailConfig.brandName}</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${this.emailConfig.brandTagline}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">
        🔒 Password Reset Request
      </h2>
      
      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
        We received a request to reset your password for your ${this.emailConfig.brandName} account. Use the verification code below to proceed with resetting your password:
      </p>
      
      <!-- OTP Box -->
      <div style="background: #fff5f5; border: 3px dashed #dc3545; padding: 30px; text-align: center; margin: 30px 0; border-radius: 12px;">
        <div style="font-size: 36px; font-weight: bold; color: #dc3545; letter-spacing: 8px; font-family: monospace; margin-bottom: 15px;">
          ${otp}
        </div>
        <p style="margin: 0; color: #666; font-size: 14px;">
          Enter this code to reset your password
        </p>
      </div>
      
      <!-- Warning -->
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0; color: #856404; font-size: 15px;">
           <strong>Important:</strong> This code expires in <strong>10 minutes</strong> for security.
        </p>
      </div>
      
      <!-- Security Notice -->
      <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; margin: 25px 0; border-radius: 8px;">
        <p style="margin: 0; color: #721c24; font-size: 14px; line-height: 1.5;">
           <strong>Security Alert:</strong> If you didn't request this password reset, please ignore this email and consider changing your password immediately. Someone may be trying to access your account.
        </p>
      </div>
      
      <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
        If you didn't request this password reset, please contact our support team immediately at <a href="mailto:${this.emailConfig.supportEmail}" style="color: #dc3545;">${this.emailConfig.supportEmail}</a>.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; font-weight: bold;">
        ${this.emailConfig.brandName}
      </p>
      <p style="margin: 0 0 15px 0; font-size: 12px; color: #888; line-height: 1.4;">
        This is an automated security message. Please do not reply.<br>
        ${this.emailConfig.companyAddress}
      </p>
      <p style="margin: 0; font-size: 11px; color: #aaa;">
        © ${new Date().getFullYear()} ${this.emailConfig.brandName}. All rights reserved.<br>
        <a href="${this.emailConfig.unsubscribeUrl}" style="color: #888;">Unsubscribe</a>
      </p>
    </div>
    
  </div>
</body>
</html>`;
}

// Password Reset plain text version
generatePasswordResetText(otp) {
  return `${this.emailConfig.brandName} - Password Reset Request

Hello,

We received a request to reset your password for your ${this.emailConfig.brandName} account.

Password Reset Code: ${otp}

This code will expire in 10 minutes for security reasons.

SECURITY ALERT: If you didn't request this password reset, please ignore this email and consider changing your password immediately.

Need help? Contact us at ${this.emailConfig.supportEmail}

---
${this.emailConfig.brandName}
${this.emailConfig.companyAddress}

Unsubscribe: ${this.emailConfig.unsubscribeUrl}
`;
}

  
}

module.exports = new EmailService();
