import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { put } from '@vercel/blob';
import { BadRequestError } from '@core/backend';

/**
 * Estratégia:
 *  - Em produção (Vercel) → usa @vercel/blob (BLOB_READ_WRITE_TOKEN definido).
 *  - Em dev local        → grava em disco em apps/petacolhe-api/uploads/.
 *
 * O frontend não muda — recebe sempre { url, filename }.
 */
const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Memória pra ambos os modos — em dev escrevemos no disco depois,
// em prod mandamos pro Blob.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(new BadRequestError(`Extensão não permitida: ${ext}`));
    cb(null, true);
  },
});

export function buildUploadsRouter(publicBaseUrl: string): Router {
  const router = Router();

  router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) throw new BadRequestError('arquivo ausente (campo "file")');
    const ext = extname(req.file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Produção — Vercel Blob
      const blob = await put(`petacolhe/${filename}`, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      res.status(201).json({
        url: blob.url,
        filename,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
      return;
    }

    // Dev — grava no disco
    writeFileSync(resolve(UPLOAD_DIR, filename), req.file.buffer);
    res.status(201).json({
      url: `${publicBaseUrl}/uploads/${filename}`,
      filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  });

  return router;
}

export { UPLOAD_DIR };
