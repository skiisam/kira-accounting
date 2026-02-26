import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/config';
import { BadRequestError, UnauthorizedError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { JwtPayload } from '../middleware/auth';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class AuthController {
  /**
   * Delete current user's account
   */
  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId as number | undefined;
      const { password, confirm } = req.body as { password?: string; confirm?: string };
      if (!userId) {
        throw UnauthorizedError('Not authenticated');
      }
      if (!password || confirm !== 'DELETE') {
        throw BadRequestError('Password and confirmation are required');
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw BadRequestError('User not found');
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        throw UnauthorizedError('Invalid password');
      }
      await prisma.user.delete({ where: { id: user.id } });
      logger.info(`User account deleted: ${user.code}`);
      await prisma.auditTrail.create({
        data: {
          userId: user.id,
          userCode: user.code,
          action: 'ACCOUNT_DELETE',
          moduleCode: 'AUTH',
          tableName: 'users',
          recordId: user.id,
          ipAddress: req.ip,
          machineName: req.headers['user-agent'] as string | undefined,
        },
      });
      res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
      next(error);
    }
  };
  /**
   * User login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userCode, password, totpCode } = req.body;

      if (!userCode || !password) {
        throw BadRequestError('User code and password are required');
      }

      // Find user (case-sensitive)
      const user = await prisma.user.findUnique({
        where: { code: userCode },
        include: { group: true, company: true },
      });

      if (!user || !user.isActive) {
        await prisma.auditTrail.create({
          data: {
            userCode: userCode,
            action: 'LOGIN_FAIL',
            moduleCode: 'AUTH',
            tableName: 'users',
            ipAddress: req.ip,
            machineName: req.headers['user-agent'] as string | undefined,
          },
        });
        throw UnauthorizedError('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        await prisma.auditTrail.create({
          data: {
            userId: user.id,
            userCode: user.code,
            action: 'LOGIN_FAIL',
            moduleCode: 'AUTH',
            tableName: 'users',
            recordId: user.id,
            ipAddress: req.ip,
            machineName: req.headers['user-agent'] as string | undefined,
          },
        });
        throw UnauthorizedError('Invalid credentials');
      }

      // Enforce MFA if enabled
      if ((user as any).mfaEnabled) {
        if (!totpCode) {
          return res.status(401).json({
            success: false,
            error: { code: 'MFA_REQUIRED', message: 'Two-factor code required' },
          });
        }
        const ok = speakeasy.totp.verify({
          secret: (user as any).mfaSecret!,
          encoding: 'base32',
          token: totpCode,
          window: 1,
        });
        if (!ok) {
          return res.status(401).json({
            success: false,
            error: { code: 'MFA_INVALID', message: 'Invalid two-factor code' },
          });
        }
      }

      // Generate tokens
      const payload: JwtPayload = {
        userId: user.id,
        userCode: user.code,
        email: user.email ?? undefined,
        groupId: user.groupId,
        companyId: user.companyId ?? undefined,
        isAdmin: user.isAdmin,
      };

      const accessToken = jwt.sign(
        payload,
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as unknown as any }
      );

      // Opaque refresh token with rotation
      const rawRefresh = `${uuidv4()}.${crypto.randomBytes(24).toString('base64url')}`;
      const tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
      const expiresAt = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));
      await (prisma as any).refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          userAgent: req.headers['user-agent'] as string | undefined,
          ipAddress: req.ip,
        },
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      logger.info(`User logged in: ${user.code}`);

      await prisma.auditTrail.create({
        data: {
          userId: user.id,
          userCode: user.code,
          action: 'LOGIN',
          moduleCode: 'AUTH',
          tableName: 'users',
          recordId: user.id,
          ipAddress: req.ip,
          machineName: req.headers['user-agent'] as string | undefined,
        },
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            code: user.code,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            group: user.group.name,
            company: user.company?.name,
          },
          accessToken,
          refreshToken: rawRefresh,
          expiresIn: config.jwt.expiresIn,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw BadRequestError('Refresh token is required');
      }

      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const token = await (prisma as any).refreshToken.findUnique({ where: { tokenHash: hash } });
      if (!token || token.revokedAt || token.expiresAt < new Date()) {
        return next(UnauthorizedError('Invalid refresh token'));
      }
      const user = await prisma.user.findUnique({ where: { id: token.userId } });
      if (!user || !user.isActive) {
        return next(UnauthorizedError('User not found or inactive'));
      }

      // Generate new access token
      const payload: JwtPayload = {
        userId: user.id,
        userCode: user.code,
        email: user.email ?? undefined,
        groupId: user.groupId,
        isAdmin: user.isAdmin,
      };

      const accessToken = jwt.sign(
        payload,
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as unknown as any }
      );

      // Rotate refresh token
      const newRaw = `${uuidv4()}.${crypto.randomBytes(24).toString('base64url')}`;
      const newHash = crypto.createHash('sha256').update(newRaw).digest('hex');
      const newExpiresAt = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));
      const created = await (prisma as any).refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newHash,
          expiresAt: newExpiresAt,
          userAgent: req.headers['user-agent'] as string | undefined,
          ipAddress: req.ip,
        },
      });
      await (prisma as any).refreshToken.update({
        where: { tokenHash: hash },
        data: { revokedAt: new Date(), replacedById: created.id },
      });

      await prisma.auditTrail.create({
        data: {
          userId: user.id,
          userCode: user.code,
          action: 'TOKEN_REFRESH',
          moduleCode: 'AUTH',
          tableName: 'users',
          recordId: user.id,
          ipAddress: req.ip,
          machineName: req.headers['user-agent'] as string | undefined,
        },
      });
      res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: config.jwt.expiresIn,
          refreshToken: newRaw,
        },
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        next(UnauthorizedError('Refresh token expired'));
      } else {
        next(error);
      }
    }
  };

  /**
   * Get current user info
   */
  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: {
          group: {
            include: {
              accessRights: true,
            },
          },
          company: true,
        },
      });

      if (!user) {
        throw UnauthorizedError('User not found');
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          code: user.code,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isAdmin: user.isAdmin,
          group: {
            id: user.group.id,
            code: user.group.code,
            name: user.group.name,
          },
          company: user.company ? {
            id: user.company.id,
            code: user.company.code,
            name: user.company.name,
          } : null,
          permissions: user.isAdmin ? 'ALL' : user.group.accessRights,
          defaultLocationId: user.defaultLocationId,
          defaultProjectId: user.defaultProjectId,
          defaultDepartmentId: user.defaultDepartmentId,
          lastLoginAt: user.lastLoginAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw BadRequestError('Current and new passwords are required');
      }

      if (newPassword.length < 6) {
        throw BadRequestError('New password must be at least 6 characters');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
      });

      if (!user) {
        throw UnauthorizedError('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw UnauthorizedError('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });

      logger.info(`Password changed for user: ${user.code}`);

      await prisma.auditTrail.create({
        data: {
          userId: user.id,
          userCode: user.code,
          action: 'PASSWORD_CHANGE',
          moduleCode: 'AUTH',
          tableName: 'users',
          recordId: user.id,
          ipAddress: req.ip,
          machineName: req.headers['user-agent'] as string | undefined,
        },
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body as { refreshToken?: string };
      if (refreshToken) {
        const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await (prisma as any).refreshToken.updateMany({ where: { tokenHash: hash, revokedAt: null }, data: { revokedAt: new Date() } });
      } else {
        await (prisma as any).refreshToken.updateMany({
          where: { userId: req.user!.userId, userAgent: req.headers['user-agent'] as string | undefined, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      logger.info(`User logged out: ${req.user!.userCode}`);

      await prisma.auditTrail.create({
        data: {
          userId: req.user!.userId,
          userCode: req.user!.userCode,
          action: 'LOGOUT',
          moduleCode: 'AUTH',
          tableName: 'users',
          recordId: req.user!.userId,
          ipAddress: req.ip,
          machineName: req.headers['user-agent'] as string | undefined,
        },
      });

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Forgot password - lookup user by code or email
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { identifier } = req.body; // Can be user code or email

      if (!identifier) {
        throw BadRequestError('User code or email is required');
      }

      // Find user by code or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { code: identifier },
            { email: identifier.toLowerCase() },
          ],
          isActive: true,
        },
      });

      if (!user) {
        // Don't reveal if user exists - security best practice
        // But for internal systems, we can be more helpful
        throw BadRequestError('No active user found with this user code or email');
      }

      // Generate password reset token (expires in 1 hour)
      const resetToken = jwt.sign(
        { userId: user.id, userCode: user.code, type: 'password_reset' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      logger.info(`Password reset requested for user: ${user.code}`);

      await prisma.auditTrail.create({
        data: {
          userId: user.id,
          userCode: user.code,
          action: 'PASSWORD_RESET_REQUEST',
          moduleCode: 'AUTH',
          tableName: 'users',
          recordId: user.id,
          ipAddress: req.ip,
          machineName: req.headers['user-agent'] as string | undefined,
        },
      });

      res.json({
        success: true,
        data: {
          message: 'Password reset token generated',
          userCode: user.code,
          email: user.email ? `${user.email.substring(0, 3)}***@***` : null,
          resetToken, // In production, send via email instead
          expiresIn: '1 hour',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify reset token
   */
  verifyResetToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      if (!token) {
        throw BadRequestError('Reset token is required');
      }

      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== 'password_reset') {
        throw BadRequestError('Invalid reset token');
      }

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, code: true, name: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw BadRequestError('User not found or inactive');
      }

      await prisma.auditTrail.create({
        data: {
          userId: user.id,
          userCode: user.code,
          action: 'RESET_TOKEN_VERIFY',
          moduleCode: 'AUTH',
          tableName: 'users',
          recordId: user.id,
          ipAddress: req.ip,
          machineName: req.headers['user-agent'] as string | undefined,
        },
      });
      res.json({
        success: true,
        data: {
          valid: true,
          userCode: user.code,
          userName: user.name,
        },
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        next(BadRequestError('Reset token has expired'));
      } else if (error instanceof jwt.JsonWebTokenError) {
        next(BadRequestError('Invalid reset token'));
      } else {
        next(error);
      }
    }
  };

  /**
   * Reset password using token
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw BadRequestError('Reset token and new password are required');
      }

      if (newPassword.length < 6) {
        throw BadRequestError('New password must be at least 6 characters');
      }

      const decoded = jwt.verify(token, config.jwt.secret) as any;

      if (decoded.type !== 'password_reset') {
        throw BadRequestError('Invalid reset token');
      }

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        throw BadRequestError('User not found or inactive');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });

      logger.info(`Password reset completed for user: ${user.code}`);

      await prisma.auditTrail.create({
        data: {
          userId: user.id,
          userCode: user.code,
          action: 'PASSWORD_RESET',
          moduleCode: 'AUTH',
          tableName: 'users',
          recordId: user.id,
          ipAddress: req.ip,
          machineName: req.headers['user-agent'] as string | undefined,
        },
      });

      res.json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.',
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        next(BadRequestError('Reset token has expired. Please request a new one.'));
      } else if (error instanceof jwt.JsonWebTokenError) {
        next(BadRequestError('Invalid reset token'));
      } else {
        next(error);
      }
    }
  };

  /**
   * Lookup username by email
   */
  lookupUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw BadRequestError('Email is required');
      }

      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true,
        },
        select: { code: true, name: true },
      });

      if (!user) {
        throw BadRequestError('No active user found with this email address');
      }

      logger.info(`Username lookup for email: ${email}`);

      res.json({
        success: true,
        data: {
          userCode: user.code,
          userName: user.name,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ================= MFA (TOTP) =================
  mfaSetup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const secret = speakeasy.generateSecret({ name: `KIRA (${req.user!.userCode})`, length: 20 });
      await (prisma as any).user.update({
        where: { id: req.user!.userId },
        data: { mfaSecret: secret.base32, mfaEnabled: false },
      });
      const otpauth = secret.otpauth_url!;
      const qr = await QRCode.toDataURL(otpauth);
      res.json({ success: true, data: { otpauthUrl: otpauth, qrDataUrl: qr } });
    } catch (error) { next(error); }
  };

  mfaEnable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body as { code?: string };
      if (!code) throw BadRequestError('Code is required');
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!(user as any)?.mfaSecret) throw BadRequestError('MFA secret not set');
      const ok = speakeasy.totp.verify({ secret: (user as any).mfaSecret, encoding: 'base32', token: code, window: 1 });
      if (!ok) return next(UnauthorizedError('Invalid code'));
      const recovery = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').toUpperCase());
      await (prisma as any).user.update({
        where: { id: user.id },
        data: { mfaEnabled: true, mfaRecoveryCodes: recovery },
      });
      res.json({ success: true, data: { recoveryCodes: recovery } });
    } catch (error) { next(error); }
  };

  mfaDisable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password } = req.body as { password?: string };
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!user) return next(UnauthorizedError('User not found'));
      if (!password) throw BadRequestError('Password required');
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return next(UnauthorizedError('Invalid password'));
      await (prisma as any).user.update({
        where: { id: user.id },
        data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: null },
      });
      res.json({ success: true, message: 'Two-factor authentication disabled' });
    } catch (error) { next(error); }
  };

  mfaQrCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (!(user as any)?.mfaSecret) throw BadRequestError('MFA not set up');
      const otpauth = `otpauth://totp/KIRA%20(${encodeURIComponent(user.code)})?secret=${(user as any).mfaSecret}&issuer=KIRA`;
      const qr = await QRCode.toDataURL(otpauth);
      res.json({ success: true, data: { otpauthUrl: otpauth, qrDataUrl: qr } });
    } catch (error) { next(error); }
  };
}

// Helpers
function parseDuration(input: string): number {
  const m = /^(\d+)([smhd])$/.exec(input);
  if (!m) {
    const hours = Number(input) || 1;
    return hours * 3600 * 1000;
    }
  const n = parseInt(m[1], 10);
  const unit = m[2];
  switch (unit) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    default: return n * 1000;
  }
}
