import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/config';
import { BadRequestError, UnauthorizedError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { JwtPayload } from '../middleware/auth';

export class AuthController {
  /**
   * User login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userCode, password } = req.body;

      if (!userCode || !password) {
        throw BadRequestError('User code and password are required');
      }

      // Find user (case-sensitive)
      const user = await prisma.user.findUnique({
        where: { code: userCode },
        include: {
          group: true,
          company: true,
        },
      });

      if (!user || !user.isActive) {
        throw UnauthorizedError('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw UnauthorizedError('Invalid credentials');
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

      const refreshToken = jwt.sign(
        payload,
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn as unknown as any }
      );

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      logger.info(`User logged in: ${user.code}`);

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
          refreshToken,
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

      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, code: true, isActive: true, groupId: true, isAdmin: true, email: true },
      });

      if (!user || !user.isActive) {
        throw UnauthorizedError('User not found or inactive');
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

      res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: config.jwt.expiresIn,
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
      // In a more complex implementation, you might want to:
      // - Invalidate the refresh token
      // - Add the access token to a blacklist
      // - Clear any server-side sessions

      logger.info(`User logged out: ${req.user!.userCode}`);

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

      // In production, you would send this via email
      // For now, we'll return it directly (for internal/development use)
      logger.info(`Password reset requested for user: ${user.code}`);

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
}
