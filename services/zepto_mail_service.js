// ============================================================================
// FIXED FILE: services/zepto_mail_service.js
// ============================================================================

const { SendMailClient } = require("zeptomail");
const crypto = require("crypto");

class ZeptoMailService {
  constructor() {
    this.templateClient = new SendMailClient({
      url: "https://api.zeptomail.com/v1.1/email/template",
      token: process.env.ZEPTOMAIL_TOKEN,
    });

    // Client for Raw Emails - No /template
    this.rawClient = new SendMailClient({
      url: "https://api.zeptomail.com/v1.1/email",
      token: process.env.ZEPTOMAIL_TOKEN,
    });
    // Template Keys
    this.templates = {
      otp_verification: process.env.ZEPTOMAIL_OTP_TEMPLATE_KEY,
      welcome: process.env.ZEPTOMAIL_WELCOME_TEMPLATE_KEY,
      password_reset: process.env.ZEPTOMAIL_RESET_TEMPLATE_KEY,
    };

    // Configuration
    this.emailConfig = {
      brandName: "RoboNinjaz",
      // Ensure this email is a verified sender in ZeptoMail dashboard
      noreplyEmail: process.env.EMAIL_USER || "info@roboninjaz.com",
      supportEmail: process.env.SUPPORT_EMAIL || "roboninjaztest@gmail.com",
    };
  }

  // Helper to generate 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }


  async sendOTP(email, otp, purpose = "verification") {
  try {
    const mailOptions = {
      template_key: this.templates.otp_verification,  // Add template_key here
      from: {
        address: this.emailConfig.noreplyEmail,
        name: `${this.emailConfig.brandName} Security`,
      },
      to: [
        {
          email_address: {
            address: email,
            name: email.split("@")[0],
          },
        },
      ],
      merge_info: {
        OTP: otp,
        purpose: purpose === "login" ? "Login Verification" : "Email Verification",
        expiry: "10 minutes",
        brandName: this.emailConfig.brandName,
        supportEmail: this.emailConfig.supportEmail,
      },
    };

    console.log("Sending OTP Template...");

    // Pass the entire mailOptions object as a single parameter
    const response = await this.templateClient.sendMailWithTemplate(mailOptions);

    console.log("ZeptoMail Success:", response);
    return { success: true, messageId: response.message_id || response.request_id };
  } catch (error) {
    console.error("ZeptoMail OTP Failed:", error);
    throw new Error(`Failed to send OTP: ${JSON.stringify(error)}`);
  }
}

async sendWelcomeEmail(email, username) {
  try {
    const mailOptions = {
      template_key: this.templates.welcome,  // Add template_key here
      from: {
        address: this.emailConfig.noreplyEmail,
        name: `${this.emailConfig.brandName} Team`,
      },
      to: [
        {
          email_address: {
            address: email,
            name: username,
          },
        },
      ],
      merge_info: {
        name: username,
        brandName: this.emailConfig.brandName,
      },
    };

    const response = await this.templateClient.sendMailWithTemplate(mailOptions);
    return { success: true, messageId: response.message_id };
  } catch (error) {
    console.error("Welcome Email Failed:", error);
    return { success: false, error: error };
  }
}

/**
 * Send Password Reset OTP using a Template
 */
async sendPasswordResetOTP(email, otp) {
  try {
    const mailOptions = {
      template_key: this.templates.password_reset,
      from: {
        address: this.emailConfig.noreplyEmail,
        name: `${this.emailConfig.brandName} Security`,
      },
      to: [
        {
          email_address: {
            address: email,
            name: email.split("@")[0],
          },
        },
      ],
      merge_info: {
        OTP: otp,
        expiry: "10 minutes",
        brandName: this.emailConfig.brandName,
        supportEmail: this.emailConfig.supportEmail,
      },
    };

    console.log("Sending Password Reset OTP Template...");

    const response = await this.templateClient.sendMailWithTemplate(mailOptions);

    console.log("ZeptoMail Password Reset Success:", response);
    return { success: true, messageId: response.message_id || response.request_id };
  } catch (error) {
    console.error("ZeptoMail Password Reset Failed:", error);
    throw new Error(`Failed to send password reset OTP: ${JSON.stringify(error)}`);
  }
}


  /**
   * Send Raw Email (No Template)
   */
  async sendRawEmail(to, subject, htmlBody) {
    try {
      const mailOptions = {
        from: {
          address: this.emailConfig.noreplyEmail,
          name: this.emailConfig.brandName,
        },
        to: [
          {
            email_address: {
              address: to,
            },
          },
        ],
        subject: subject,
        htmlbody: htmlBody,
      };

      // USE THE RAW CLIENT
      const response = await this.rawClient.sendMail(mailOptions);
      return { success: true, messageId: response.message_id };
    } catch (error) {
      console.error("Raw Email Failed:", error);
      throw new Error("Failed to send raw email");
    }
  }
}

module.exports = new ZeptoMailService();