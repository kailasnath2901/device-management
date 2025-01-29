const User = require('../model/user.model');
const bcrypt = require('bcrypt');

class InitialSetupService {
  async checkInitialSetup() {
    const superAdminCount = await User.count({ 
      where: { role: 'super_admin' } 
    });
    return superAdminCount > 0;
  }

  async performInitialSetup(setupData) {
    const { username, email, password } = setupData;

    // Validate input
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ 
      where: { role: 'super_admin' } 
    });

    if (existingSuperAdmin) {
      throw new Error('Super admin already exists');
    }

    // Check if email is already in use
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Email is already in use');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create super admin
    return User.create({
      username,
      email,
      password: hashedPassword,
      role: 'super_admin'
    });
  }
}

module.exports = new InitialSetupService();