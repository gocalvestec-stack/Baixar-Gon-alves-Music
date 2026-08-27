"use strict";

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const labelgridToken = process.env.LABELGRID_API_TOKEN;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({
      ok: false,
      backend: true,
      supabaseConfigured: false,
      labelgridConfigured: Boolean(labelgridToken),
      status: "configuration_error",
      message: "Variáveis do Supabase não configuradas."
    });
  }

  try {
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Teste simples de conexão.
    // Não depende de uma tabela específica.
    const {
      data,
      error
    } = await supabase
      .from("platforms")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase health:", error);

      return res.status(200).json({
        ok: false,
        backend: true,
        supabaseConfigured: true,
        supabaseConnected: false,
        labelgridConfigured: Boolean(labelgridToken),
        status: "database_error",
        message: error.message
      });
    }

    return res.status(200).json({
      ok: true,
      backend: true,
      supabaseConfigured: true,
      supabaseConnected: true,
      storageConfigured: true,
      labelgridConfigured: Boolean(labelgridToken),
      status: "online",
      message: "Gonçalves Music API online."
    });

  } catch (error) {

    console.error("Health error:", error);

    return res.status(200).json({
      ok: false,
      backend: true,
      supabaseConfigured: true,
      supabaseConnected: false,
      labelgridConfigured: Boolean(labelgridToken),
      status: "error",
      message: error.message || "Erro desconhecido."
    });
  }
}
