import { Router } from "express";
import multer from "multer";
import {
  createRelease,
  listReleases,
  getRelease,
  validateRelease,
  distributeRelease,
  deliveryStatus,
  createTrack,
  updateTrack,
  getTrack,
  getDistroOutlets
} from "../services/labelgrid.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 300 * 1024 * 1024
  }
});

router.get("/", async (req, res) => {
  try {
    res.json(await listReleases(req.query));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.get("/outlets", async (_req, res) => {
  try {
    res.json(await getDistroOutlets());
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.get("/:id", async (req, res) => {
  try {
    res.json(await getRelease(req.params.id));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.post("/", async (req, res) => {
  try {
    res.status(201).json(await createRelease(req.body));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.post("/:id/validate", async (req, res) => {
  try {
    res.json(await validateRelease(req.params.id));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.post("/:id/distribute", async (req, res) => {
  try {
    res.json(await distributeRelease(req.params.id, req.body || {}));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.get("/:id/delivery-status", async (req, res) => {
  try {
    res.json(await deliveryStatus(req.params.id));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

/*
  Endpoint de upload local da V1.
  Nesta primeira versão ele recebe o arquivo e informa que o próximo passo
  é armazená-lo em Supabase Storage/S3 e usar o fluxo de upload presigned da LabelGrid.
  Não enviamos bytes diretamente para a API sem seguir o fluxo de upload documentado.
*/
router.post("/:id/upload", upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 }
]), async (req, res) => {
  const audio = req.files?.audio?.[0];
  const cover = req.files?.cover?.[0];

  if (!audio && !cover) {
    return res.status(400).json({ error: "Envie pelo menos áudio ou capa." });
  }

  res.status(501).json({
    error: "Upload storage ainda não conectado.",
    next: "Configure Supabase Storage/S3 e depois use os endpoints presigned da LabelGrid.",
    received: {
      audio: audio ? { name: audio.originalname, size: audio.size, type: audio.mimetype } : null,
      cover: cover ? { name: cover.originalname, size: cover.size, type: cover.mimetype } : null
    }
  });
});

router.post("/tracks", async (req, res) => {
  try {
    res.status(201).json(await createTrack(req.body));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.get("/tracks/:id", async (req, res) => {
  try {
    res.json(await getTrack(req.params.id));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.patch("/tracks/:id", async (req, res) => {
  try {
    res.json(await updateTrack(req.params.id, req.body));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

export default router;
