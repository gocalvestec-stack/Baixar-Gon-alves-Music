"use strict";

import { createClient } from "@supabase/supabase-js";
import Busboy from "busboy";

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

const MAX_AUDIO_SIZE = 500 * 1024 * 1024;
const MAX_COVER_SIZE = 20 * 1024 * 1024;

const AUDIO_EXTENSIONS = [".wav", ".flac", ".mp3"];
const COVER_EXTENSIONS = [".jpg", ".jpeg", ".png"];

function extension(filename = "") {
  const name = filename.toLowerCase();
  const position = name.lastIndexOf(".");
  return position >= 0 ? name.slice(position) : "";
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createCatalogNumber() {
  const now = new Date();

  const year = now.getFullYear();

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `GM-${year}-${random}`;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readMultipart(req) {
  return new Promise((resolve, reject) => {

    const fields = {};
    const files = {};

    const bb = Busboy({
      headers: req.headers,
      limits: {
        files: 2,
        fileSize: MAX_AUDIO_SIZE
      }
    });

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on(
      "file",
      (fieldname, file, info) => {

        const chunks = [];
        let size = 0;

        file.on("data", (chunk) => {

          size += chunk.length;

          if (
            fieldname === "audio" &&
            size > MAX_AUDIO_SIZE
          ) {
            file.destroy(
              new Error(
                "O arquivo de áudio excede 500 MB."
              )
            );

            return;
          }

          if (
            fieldname === "cover" &&
            size > MAX_COVER_SIZE
          ) {
            file.destroy(
              new Error(
                "A capa excede 20 MB."
              )
            );

            return;
          }

          chunks.push(chunk);
        });

        file.on("end", () => {

          files[fieldname] = {
            buffer: Buffer.concat(chunks),
            filename: info.filename,
            mimeType: info.mimeType,
            size
          };

        });

        file.on("error", reject);
      }
    );

    bb.on("error", reject);

    bb.on("finish", () => {

      resolve({
        fields,
        files
      });

    });

    req.pipe(bb);
  });
}

async function uploadFile(
  bucket,
  path,
  file,
  contentType
) {

  const { error } =
    await supabase.storage
      .from(bucket)
      .upload(
        path,
        file.buffer,
        {
          contentType,
          upsert: false
        }
      );

  if (error) {
    throw new Error(
      `Erro no upload: ${error.message}`
    );
  }

  const {
    data
  } =
    supabase.storage
      .from(bucket)
      .getPublicUrl(path);

  return {
    path,
    url: data.publicUrl
  };
}

export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  let parsed;

  try {

    parsed =
      await readMultipart(req);

  } catch (error) {

    console.error(
      "Multipart error:",
      error
    );

    return res.status(400).json({
      error:
        error.message ||
        "Não foi possível processar os arquivos."
    });
  }

  const {
    fields,
    files
  } = parsed;

  /* =========================================
     METADADOS
     ========================================= */

  const release =
    parseJson(fields.release);

  if (!release) {

    return res.status(400).json({
      error:
        "Dados do lançamento inválidos."
    });
  }

  const title =
    release.titles?.[0]?.text?.trim();

  const artistName =
    String(
      fields.artist_name ||
      release.artist_name ||
      ""
    ).trim();

  const genre =
    String(
      release.primary_genre ||
      ""
    ).trim();

  const contentType =
    String(
      release.content_type ||
      "Single"
    ).trim();

  const releaseDate =
    String(
      release.original_release_date ||
      ""
    ).trim();

  const description =
    release.descriptions?.[0]?.text ||
    "";

  const explicit =
    Boolean(release.explicit);

  const aiDisclosure =
    Boolean(release.ai_disclosure);

  let catalogNumber =
    String(
      release.catalog_number ||
      ""
    ).trim();

  /* =========================================
     VALIDAÇÕES
     ========================================= */

  if (!title) {

    return res.status(400).json({
      error:
        "O título da música é obrigatório."
    });
  }

  if (!artistName) {

    return res.status(400).json({
      error:
        "O artista principal é obrigatório."
    });
  }

  if (!genre) {

    return res.status(400).json({
      error:
        "O gênero musical é obrigatório."
    });
  }

  if (!releaseDate) {

    return res.status(400).json({
      error:
        "A data de lançamento é obrigatória."
    });
  }

  if (!files.audio) {

    return res.status(400).json({
      error:
        "O arquivo de áudio é obrigatório."
    });
  }

  if (!files.cover) {

    return res.status(400).json({
      error:
        "A capa é obrigatória."
    });
  }

  /* =========================================
     VALIDA ÁUDIO
     ========================================= */

  const audio =
    files.audio;

  const audioExtension =
    extension(audio.filename);

  if (
    !AUDIO_EXTENSIONS.includes(
      audioExtension
    )
  ) {

    return res.status(400).json({
      error:
        "Formato de áudio inválido. Use WAV, FLAC ou MP3."
    });
  }

  if (
    audio.size >
    MAX_AUDIO_SIZE
  ) {

    return res.status(400).json({
      error:
        "O áudio ultrapassa o limite de 500 MB."
    });
  }

  /* =========================================
     VALIDA CAPA
     ========================================= */

  const cover =
    files.cover;

  const coverExtension =
    extension(cover.filename);

  if (
    !COVER_EXTENSIONS.includes(
      coverExtension
    )
  ) {

    return res.status(400).json({
      error:
        "Formato de capa inválido. Use JPG ou PNG."
    });
  }

  if (
    cover.size >
    MAX_COVER_SIZE
  ) {

    return res.status(400).json({
      error:
        "A capa ultrapassa o limite de 20 MB."
    });
  }

  /* =========================================
     ARTISTA
     ========================================= */

  let artistId = null;

  const {
    data: existingArtist,
    error: artistSearchError
  } =
    await supabase
      .from("artists")
      .select("id,nome,name")
      .ilike("nome", artistName)
      .limit(1)
      .maybeSingle();

  if (
    artistSearchError &&
    artistSearchError.code !== "PGRST116"
  ) {

    console.error(
      artistSearchError
    );
  }

  if (existingArtist) {

    artistId =
      existingArtist.id;

  } else {

    /*
     * Se sua tabela artists usa "name"
     * em vez de "nome", alteraremos aqui
     * conforme o schema definitivo.
     */

    const {
      data: newArtist,
      error: artistError
    } =
      await supabase
        .from("artists")
        .insert({
          nome: artistName
        })
        .select("id")
        .single();

    if (artistError) {

      return res.status(500).json({
        error:
          `Não foi possível criar o artista: ${artistError.message}`
      });
    }

    artistId =
      newArtist.id;
  }

  /* =========================================
     CATÁLOGO
     ========================================= */

  if (!catalogNumber) {

    catalogNumber =
      createCatalogNumber();
  }

  /* =========================================
     ID DO LANÇAMENTO
     ========================================= */

  const releaseSlug =
    slugify(title);

  const timestamp =
    Date.now();

  const audioPath =
    `${artistId}/${releaseSlug}-${timestamp}${audioExtension}`;

  const coverPath =
    `${artistId}/${releaseSlug}-${timestamp}${coverExtension}`;

  /* =========================================
     UPLOAD DO ÁUDIO
     ========================================= */

  let audioUpload;

  try {

    audioUpload =
      await uploadFile(
        "music-audio",
        audioPath,
        audio,
        audio.mimeType ||
        "application/octet-stream"
      );

  } catch (error) {

    console.error(
      "Audio upload:",
      error
    );

    return res.status(500).json({
      error:
        error.message
    });
  }

  /* =========================================
     UPLOAD DA CAPA
     ========================================= */

  let coverUpload;

  try {

    coverUpload =
      await uploadFile(
        "music-covers",
        coverPath,
        cover,
        cover.mimeType ||
        "image/jpeg"
      );

  } catch (error) {

    /*
     * Se a capa falhar, tenta remover
     * o áudio que já foi enviado.
     */

    await supabase.storage
      .from("music-audio")
      .remove([
        audioPath
      ]);

    console.error(
      "Cover upload:",
      error
    );

    return res.status(500).json({
      error:
        error.message
    });
  }

  /* =========================================
     CRIA RELEASE
     ========================================= */

  const releaseData = {

    artist_id:
      artistId,

    title,

    catalog_number:
      catalogNumber,

    content_type:
      contentType,

    description,

    primary_genre:
      genre,

    original_release_date:
      releaseDate,

    explicit,

    ai_disclosure:
      aiDisclosure,

    cover_url:
      coverUpload.url,

    cover_path:
      coverUpload.path,

    status:
      "draft"

  };

  const {
    data: createdRelease,
    error: releaseError
  } =
    await supabase
      .from("releases")
      .insert(releaseData)
      .select("*")
      .single();

  if (releaseError) {

    /*
     * Rollback dos arquivos.
     */

    await supabase.storage
      .from("music-audio")
      .remove([
        audioPath
      ]);

    await supabase.storage
      .from("music-covers")
      .remove([
        coverPath
      ]);

    console.error(
      "Release database:",
      releaseError
    );

    return res.status(500).json({
      error:
        `Não foi possível criar o lançamento: ${releaseError.message}`
    });
  }

  /* =========================================
     CRIA TRACK
     ========================================= */

  const trackData = {

    release_id:
      createdRelease.id,

    title,

    audio_url:
      audioUpload.url,

    audio_path:
      audioUpload.path,

    track_number:
      1

  };

  const {
    data: createdTrack,
    error: trackError
  } =
    await supabase
      .from("tracks")
      .insert(trackData)
      .select("*")
      .single();

  if (trackError) {

    /*
     * Não apagamos o release automaticamente
     * para preservar o diagnóstico.
     */

    console.error(
      "Track error:",
      trackError
    );

    return res.status(500).json({
      error:
        `Lançamento criado, mas houve erro ao registrar a faixa: ${trackError.message}`,
      release_id:
        createdRelease.id
    });
  }

  /* =========================================
     EVENTO
     ========================================= */

  try {

    await supabase
      .from("distribution_events")
      .insert({
        release_id:
          createdRelease.id,

        event_type:
          "release_created",

        status:
          "success",

        message:
          "Lançamento criado na Gonçalves Music V1."
      });

  } catch (error) {

    console.warn(
      "Não foi possível registrar evento:",
      error
    );
  }

  /* =========================================
     RESPOSTA
     ========================================= */

  return res.status(201).json({

    success: true,

    id:
      createdRelease.id,

    public_id:
      createdRelease.public_id ||
      createdRelease.id,

    release:
      createdRelease,

    track:
      createdTrack,

    files: {

      audio:
        audioUpload,

      cover:
        coverUpload
    },

    status:
      createdRelease.status ||
      "draft"

  });
}
