import { Router } from "express";
import crypto from "node:crypto";

const router = Router();

function verifySignature(req) {
  const secret = process.env.LABELGRID_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature =
    req.get("X-Webhook-Signature") ||
    req.get("X-LabelGrid-Signature") ||
    "";

  if (!signature) return false;

  const raw = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

router.post("/labelgrid", (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).json({ error: "Assinatura inválida." });
  }

  const { event, data } = req.body || {};

  console.log("[LabelGrid webhook]", event, data);

  /*
    Em produção:
    - localizar o release no Supabase
    - atualizar status
    - registrar outlet
    - salvar histórico do evento
  */

  return res.status(200).json({
    received: true,
    event: event || null
  });
});

export default router;
