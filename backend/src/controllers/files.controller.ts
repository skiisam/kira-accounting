import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config/config';

const baseDir = path.resolve(process.cwd(), config.upload.dir);
const poDir = path.join(baseDir, 'po');
const templatesDir = path.join(baseDir, 'templates');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(poDir);
ensureDir(templatesDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, poDir);
  },
  filename: (req, file, cb) => {
    const id = req.params.id;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `sales-${id}-po-${ts}-${safeName}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
});

export class FilesController {
  // ====================== SALES PO ATTACHMENTS ======================
  listSalesPOAttachments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const files = fs.readdirSync(poDir).filter(f => f.startsWith(`sales-${id}-po-`));
      const items = files.map(f => ({
        fileName: f,
        url: `/uploads/po/${f}`,
        uploadedAt: fs.statSync(path.join(poDir, f)).mtime,
      }));
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  };

  uploadSalesPOAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
      }
      const url = `/uploads/po/${path.basename(file.path)}`;
      res.status(201).json({ success: true, data: { url, fileName: path.basename(file.path) } });
    } catch (error) {
      next(error);
    }
  };

  deleteSalesPOAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileName = req.params.file;
      const full = path.join(poDir, fileName);
      if (!full.startsWith(poDir) || !fs.existsSync(full)) {
        return res.status(404).json({ success: false, error: { message: 'File not found' } });
      }
      fs.unlinkSync(full);
      res.json({ success: true, data: true });
    } catch (error) {
      next(error);
    }
  };

  // ====================== PRINT TEMPLATES ======================
  listTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const domain = (req.params.domain || '').toLowerCase(); // 'sales' or 'purchase'
      const files = fs.readdirSync(templatesDir).filter(f => f.startsWith(`${domain}-`) && f.endsWith('.html'));
      const items = files.map(f => ({
        fileName: f,
        url: `/uploads/templates/${f}`,
        uploadedAt: fs.statSync(path.join(templatesDir, f)).mtime,
        type: f.replace(`${domain}-`, '').replace(/\.html$/, ''),
      }));
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  };

  uploadTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const domain = (req.params.domain || '').toLowerCase();
      const type = (req.params.type || '').toUpperCase().replace(/[^A-Z_]/g, '');
      if (!domain || !type) {
        return res.status(400).json({ success: false, error: { message: 'Invalid domain or type' } });
      }
      const content = (req.body?.content || '') as string;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ success: false, error: { message: 'Template content required' } });
      }
      const filename = `${domain}-${type}.html`;
      fs.writeFileSync(path.join(templatesDir, filename), content, 'utf8');
      res.status(201).json({ success: true, data: { fileName: filename, url: `/uploads/templates/${filename}` } });
    } catch (error) {
      next(error);
    }
  };
}
