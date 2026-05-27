import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { BadRequestError } from '@core/backend';

/**
 * Upload local em disco — pragmático para dev.
 * Arquivos vão para `apps/petacolhe-api/uploads/` e são servidos
 * estaticamente em `/uploads/<file>` (ver server.ts).
 *
 * Trocar por MinIO/Cloudinary: substituir o `storage` do multer por
 * `multer-s3` ou um middleware que faça upload remoto e devolva URL.
 */
const UPLOAD_DIR = resolve(process.cwd(), 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new BadRequestError(`Extensão não permitida: ${ext}`));
    cb(null, true);
  },
});

export function buildUploadsRouter(publicBaseUrl: string): Router {
  const router = Router();

  router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) throw new BadRequestError('arquivo ausente (campo "file")');
    const url = `${publicBaseUrl}/uploads/${req.file.filename}`;
    res.status(201).json({
      url,
      filename: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  });

  return router;
}

export { UPLOAD_DIR };
