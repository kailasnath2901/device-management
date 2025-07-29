const OTP = require('../model/otp.model');
const EmailService = require('./email.services');
const { Op } = require('sequelize');

class OTPService {
  // Generate and send OTP
  async generateAndSendOTP(email, purpose = 'email_verification') {
    try {
      // Clean up old OTPs for this email and purpose
      await OTP.destroy({
        where: {
          email,
          purpose,
          [Op.or]: [
            { expires_at: { [Op.lt]: new Date() } },
            { is_used: true }
          ]
        }
      });

      // Generate new OTP
      const otp = EmailService.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to database
      await OTP.create({
        email,
        otp,
        purpose,
        expires_at: expiresAt,
      });

      // Send OTP email
      await EmailService.sendOTP(email, otp, purpose);

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 10 
      };
    } catch (error) {
      console.error('OTP generation failed:', error);
      throw new Error('Failed to generate and send OTP');
    }
  }

  // Verify OTP
  async verifyOTP(email, otp, purpose = 'email_verification') {
    try {
      const otpRecord = await OTP.findOne({
        where: {
          email,
          purpose,
          is_used: false,
          expires_at: { [Op.gt]: new Date() }
        },
        order: [['createdAt', 'DESC']]
      });

      if (!otpRecord) {
        throw new Error('OTP not found or expired');
      }

      // Check attempts (max 3 attempts)
      if (otpRecord.attempts >= 3) {
        await otpRecord.update({ is_used: true });
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        await otpRecord.increment('attempts');
        throw new Error('Invalid OTP');
      }

      // Mark OTP as used
      await otpRecord.update({ is_used: true });

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Clean up expired OTPs (call this periodically)
  async cleanupExpiredOTPs() {
    try {
      const deleted = await OTP.destroy({
        where: {
          [Op.or]: [
            { expires_at: { [Op.lt]: new Date() } },
            { is_used: true, createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // 24 hours old
          ]
        }
      });
      console.log(`Cleaned up ${deleted} expired OTPs`);
    } catch (error) {
      console.error('OTP cleanup failed:', error);
    }
  }
}

module.exports = new OTPService();