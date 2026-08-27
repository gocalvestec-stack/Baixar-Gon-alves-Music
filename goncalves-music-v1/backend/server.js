import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import releasesRouter from "./routes/releases.js";
import artistsRouter from "./routes/artists.js";
import webhooksRouter from "./routes/webhooks.js";
import { getMe } from "./services/labelgrid.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors({
  origin: process.env.FRONTEND_URL || true
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Gonçalves Music API",
    labelgridConfigured: Boolean(process.env.LABELGRID_API_TOKEN)
  });
});

app.get("/api/labelgrid/me", async (_req, res) => {
  try {
    res.json(await getMe());
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, details: e.details || null });
  }
});

app.use("/api/releases", releasesRouter);
app.use("/api/artists", artistsRouter);
app.use("/api/webhooks", webhooksRouter);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("*splat", (_req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`Gonçalves Music rodando em http://localhost:${PORT}`);
});
