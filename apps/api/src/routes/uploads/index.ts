import { Router, Request, Response } from "express";
import multer from "multer";
import { authenticateToken } from "../../middleware/authenticateToken.js";
import {
  uploadCoverImage,
  ALLOWED_MIMES,
  MAX_FILE_BYTES,
} from "../../lib/supabaseStorage.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed."));
    }
  },
});

router.post(
  "/cover",
  authenticateToken,
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(400).json({ error: "File too large. Max 2 MB." });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file provided. Send a file under the 'file' field." });
      return;
    }

    if (file.buffer.byteLength > MAX_FILE_BYTES) {
      res.status(400).json({ error: "File too large. Max 2 MB." });
      return;
    }

    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      res.status(400).json({ error: "Only JPG, PNG, and WebP images are allowed." });
      return;
    }

    try {
      const url = await uploadCoverImage(
        file.buffer,
        file.mimetype,
        file.originalname,
      );
      res.json({ url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(502).json({ error: message });
    }
  },
);

export default router;
