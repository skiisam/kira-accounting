// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { prisma } from '../config/database';

export class TwoFAController {
  // Generate 2FA secret and QR code
  setup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } });

      const secret = authenticator.generateSecret();
      const otpauthUrl = authenticator.keyuri(user.email || user.username, 'KIRA Accounting', secret);
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

      // Store secret temporarily (not enabled until verified)
      await prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: secret } as any,
      });

      res.json({
        success: true,
        data: { secret, qrCodeUrl, otpauthUrl },
        message: 'Scan the QR code with your authenticator app, then verify with a code',
      });
    } catch (error) {
      next(error);
    }
  };

  // Verify and enable 2FA
  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      if (!code) return res.status(400).json({ success: false, error: { message: 'Verification code is required' } });

      const user = await prisma.user.findUnique({ where: { id: userId } }) as any;
      if (!user?.mfaSecret) return res.status(400).json({ success: false, error: { message: '2FA not set up' } });

      const isValid = authenticator.check(code, user.mfaSecret);
      if (!isValid) return res.status(400).json({ success: false, error: { message: 'Invalid verification code' } });

      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true } as any,
      });

      res.json({ success: true, message: '2FA enabled successfully' });
    } catch (error) {
      next(error);
    }
  };

  // Disable 2FA
  disable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { code } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } }) as any;
      if (!user?.mfaEnabled) return res.status(400).json({ success: false, error: { message: '2FA is not enabled' } });

      const isValid = authenticator.check(code, user.mfaSecret);
      if (!isValid) return res.status(400).json({ success: false, error: { message: 'Invalid verification code' } });

      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null } as any,
      });

      res.json({ success: true, message: '2FA disabled successfully' });
    } catch (error) {
      next(error);
    }
  };

  // Get 2FA status
  status = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }) as any;
      res.json({ success: true, data: { enabled: !!user?.mfaEnabled } });
    } catch (error) {
      next(error);
    }
  };
}
