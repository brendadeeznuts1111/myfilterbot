/**
 * Password Security Utilities
 * Using Bun's native password hashing APIs for secure authentication
 * Bun.password provides bcrypt/argon2 password hashing
 */

export class PasswordSecurity {
  // Default cost factor for bcrypt (10-12 recommended for production)
  private static readonly DEFAULT_COST = 12;

  /**
   * Hash a password using Bun.password.hash()
   * Uses bcrypt algorithm by default with configurable cost
   */
  static async hashPassword(
    password: string,
    options?: {
      algorithm?: 'bcrypt' | 'argon2id' | 'argon2i' | 'argon2d';
      cost?: number;
    }
  ): Promise<string> {
    const algorithm = options?.algorithm || 'bcrypt';
    const cost = options?.cost || this.DEFAULT_COST;

    // Bun.password.hash() provides secure password hashing
    return await Bun.password.hash(password, {
      algorithm,
      cost,
    });
  }

  /**
   * Verify a password against a hash using Bun.password.verify()
   * Automatically detects the algorithm from the hash
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    // Bun.password.verify() safely compares passwords
    return await Bun.password.verify(password, hash);
  }

  /**
   * Generate a secure random password
   * Uses crypto.getRandomValues for cryptographically secure randomness
   */
  static generateSecurePassword(
    length: number = 16,
    options?: {
      includeUppercase?: boolean;
      includeLowercase?: boolean;
      includeNumbers?: boolean;
      includeSymbols?: boolean;
    }
  ): string {
    const opts = {
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      ...options,
    };

    let charset = '';
    if (opts.includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (opts.includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (opts.includeNumbers) charset += '0123456789';
    if (opts.includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) {
      throw new Error('At least one character type must be included');
    }

    const array = new Uint8Array(length);
    globalThis.crypto.getRandomValues(array);

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    return password;
  }

  /**
   * Check password strength
   * Returns a score from 0-5 and feedback
   */
  static checkPasswordStrength(password: string): {
    score: number;
    strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score++;
    else feedback.push('Password should be at least 8 characters');

    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score++;
    else feedback.push('Add special characters');

    // Common patterns check
    if (!/(.)\1{2,}/.test(password))
      score++; // No repeated characters
    else feedback.push('Avoid repeated characters');

    if (!/^(123|abc|qwerty|password)/i.test(password)) score++;
    else feedback.push('Avoid common patterns');

    // Determine strength label
    const strengthMap = {
      0: 'very-weak',
      1: 'very-weak',
      2: 'weak',
      3: 'weak',
      4: 'fair',
      5: 'fair',
      6: 'good',
      7: 'good',
      8: 'strong',
      9: 'very-strong',
    } as const;

    const normalizedScore = Math.min(Math.floor((score / 9) * 5), 5);
    const strength = strengthMap[Math.min(score, 9)];

    return {
      score: normalizedScore,
      strength,
      feedback,
    };
  }

  /**
   * Hash multiple passwords in parallel
   * Useful for batch user creation
   */
  static async hashPasswordBatch(
    passwords: string[],
    options?: {
      algorithm?: 'bcrypt' | 'argon2id';
      cost?: number;
    }
  ): Promise<string[]> {
    const hashPromises = passwords.map(password =>
      this.hashPassword(password, options)
    );

    return await Promise.all(hashPromises);
  }

  /**
   * Verify multiple password/hash pairs in parallel
   * Returns array of boolean results
   */
  static async verifyPasswordBatch(
    pairs: Array<{ password: string; hash: string }>
  ): Promise<boolean[]> {
    const verifyPromises = pairs.map(pair =>
      this.verifyPassword(pair.password, pair.hash)
    );

    return await Promise.all(verifyPromises);
  }

  /**
   * Generate a secure token for password reset, API keys, etc.
   * Uses Web Crypto API for cryptographic randomness
   */
  static generateSecureToken(bytes: number = 32): string {
    const array = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(array);

    // Convert to hex string
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate a time-based one-time password (TOTP) secret
   * For 2FA implementation
   */
  static generateTOTPSecret(): {
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } {
    // Generate 32-byte secret
    const secret = this.generateSecureToken(32);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      this.generateSecureToken(4).toUpperCase()
    );

    // QR code data (would need actual TOTP library for full implementation)
    const qrCode = `otpauth://totp/MyFilterBot?secret=${secret}`;

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }
}

/**
 * User authentication manager using Bun.password
 */
export class AuthManager {
  private users = new Map<
    string,
    {
      id: string;
      username: string;
      passwordHash: string;
      createdAt: Date;
      lastLogin?: Date;
      failedAttempts: number;
      lockedUntil?: Date;
    }
  >();

  /**
   * Register a new user with secure password hashing
   */
  async registerUser(
    username: string,
    password: string
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    // Check if user exists
    if (this.findUserByUsername(username)) {
      return { success: false, error: 'User already exists' };
    }

    // Check password strength
    const strength = PasswordSecurity.checkPasswordStrength(password);
    if (strength.score < 2) {
      return {
        success: false,
        error: 'Password too weak',
        ...strength,
      };
    }

    // Hash password using Bun.password
    const passwordHash = await PasswordSecurity.hashPassword(password, {
      algorithm: 'argon2id', // Most secure for new passwords
      cost: 12,
    });

    const userId = globalThis.crypto.randomUUID();
    const user = {
      id: userId,
      username,
      passwordHash,
      createdAt: new Date(),
      failedAttempts: 0,
    };

    this.users.set(userId, user);

    return { success: true, userId };
  }

  /**
   * Authenticate a user
   */
  async authenticateUser(
    username: string,
    password: string
  ): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> {
    const user = this.findUserByUsername(username);

    if (!user) {
      // Don't reveal if user exists
      await Bun.sleep(100); // Prevent timing attacks
      return { success: false, error: 'Invalid credentials' };
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return {
        success: false,
        error: `Account locked until ${user.lockedUntil.toISOString()}`,
      };
    }

    // Verify password using Bun.password
    const isValid = await PasswordSecurity.verifyPassword(
      password,
      user.passwordHash
    );

    if (!isValid) {
      user.failedAttempts++;

      // Lock account after 5 failed attempts
      if (user.failedAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        return {
          success: false,
          error: 'Account locked due to too many failed attempts',
        };
      }

      return { success: false, error: 'Invalid credentials' };
    }

    // Success - reset failed attempts
    user.failedAttempts = 0;
    user.lastLogin = new Date();
    delete user.lockedUntil;

    return { success: true, userId: user.id };
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = this.users.get(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify old password
    const isValid = await PasswordSecurity.verifyPassword(
      oldPassword,
      user.passwordHash
    );

    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Check new password strength
    const strength = PasswordSecurity.checkPasswordStrength(newPassword);
    if (strength.score < 2) {
      return {
        success: false,
        error: 'New password too weak',
        ...strength,
      };
    }

    // Hash new password
    user.passwordHash = await PasswordSecurity.hashPassword(newPassword, {
      algorithm: 'argon2id',
    });

    return { success: true };
  }

  /**
   * Reset user password (admin function)
   */
  async resetPassword(
    userId: string
  ): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
    const user = this.users.get(userId);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Generate temporary password
    const tempPassword = PasswordSecurity.generateSecurePassword(12);

    // Hash and save
    user.passwordHash = await PasswordSecurity.hashPassword(tempPassword);
    user.failedAttempts = 0;
    delete user.lockedUntil;

    return { success: true, tempPassword };
  }

  private findUserByUsername(username: string) {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  /**
   * Get user statistics
   */
  getUserStats() {
    const users = Array.from(this.users.values());
    const lockedUsers = users.filter(
      u => u.lockedUntil && u.lockedUntil > new Date()
    );
    const activeUsers = users.filter(u => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return u.lastLogin && u.lastLogin > dayAgo;
    });

    return {
      totalUsers: users.length,
      lockedUsers: lockedUsers.length,
      activeUsers: activeUsers.length,
      averageFailedAttempts:
        users.reduce((sum, u) => sum + u.failedAttempts, 0) / users.length,
    };
  }
}

// Export for use
export default PasswordSecurity;
