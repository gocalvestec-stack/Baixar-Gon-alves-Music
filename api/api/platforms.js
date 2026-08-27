"use strict";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  /*
   * Somente GET
   */

  if (req.method !== "GET") {

    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {

    /*
     * Busca plataformas ativas.
     */

    const {
      data,
      error
    } = await supabase
      .from("platforms")
      .select(`
        id,
        nome,
        slug,
        logo_url,
        ativo
      `)
      .eq("ativo", true)
      .order("nome", {
        ascending: true
      });


    if (error) {

      console.error(
        "Erro ao buscar plataformas:",
        error
      );

      return res.status(500).json({
        error:
          `Erro ao buscar plataformas: ${error.message}`
      });
    }


    /*
     * Retorna a lista.
     */

    return res.status(200).json({

      success: true,

      count:
        data?.length || 0,

      data:
        data || []

    });

  } catch (error) {

    console.error(
      "Platforms API:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Erro interno da API."
    });
  }
}
