import { Router } from "express";
import { listArtists, createArtist } from "../services/labelgrid.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    res.json(await listArtists());
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

router.post("/", async (req, res) => {
  try {
    res.status(201).json(await createArtist(req.body));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

export default router;
