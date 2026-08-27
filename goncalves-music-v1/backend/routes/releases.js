```javascript
"use strict";

import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs/promises";

/*
 * =========================================================
 * GONÇALVES MUSIC
 * API /api/releases
 *
 * GET  -> lista lançamentos
 * POST -> cria lançamento
 * =========================================================
 */

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


/*
 * =========================================================
 * VERCEL
 * =========================================================
 *
 * Desativa o parser padrão para podermos receber
 * multipart/form-data com áudio + capa.
 */

export const config = {
  api: {
    bodyParser: false
  }
};


/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function first(value) {

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}


function text(value) {

  return String(
    first(value) || ""
  ).trim();
}


function booleanValue(value) {

  const valueText =
    text(value).toLowerCase();

  return (
    value === true ||
    valueText === "true" ||
    valueText === "1" ||
    valueText === "on" ||
    valueText === "yes"
  );
}


function safeFileName(name) {

  return String(name || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}


function extension(fileName) {

  const parts =
    String(fileName || "")
      .toLowerCase()
      .split(".");

  return parts.length > 1
    ? parts.pop()
    : "";
}


function getFile(file) {

  if (Array.isArray(file)) {
    return file[0];
  }

  return file;
}


/*
 * =========================================================
 * PARSER MULTIPART
 * =========================================================
 */

async function parseMultipart(req) {

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize:
      300 * 1024 * 1024
  });


  return new Promise(
    (resolve, reject) => {

      form.parse(
        req,
        (error, fields, files) => {

          if (error) {
            reject(error);
            return;
          }

          resolve({
            fields,
            files
          });

        }
      );

    }
  );
}


/*
 * =========================================================
 * ARTISTA
 * =========================================================
 */

async function findArtist(artistName) {

  const name =
    text(artistName);


  if (!name) {

    return {
      error:
        "Informe o artista principal."
    };

  }


  /*
   * Primeiro tenta nome artístico exato.
   */

  const {
    data,
    error
  } = await supabase
    .from("artists")
    .select(`
      id,
      nome_artistico,
      status
    `)
    .ilike(
      "nome_artistico",
      name
    )
    .limit(10);


  if (error) {

    console.error(
      "Erro ao localizar artista:",
      error
    );

    return {
      error:
        `Erro ao localizar artista: ${error.message}`
    };

  }


  if (!data || data.length === 0) {

    return {
      error:
        `Artista "${name}" não encontrado. Cadastre o artista antes de criar o lançamento.`
    };

  }


  if (data.length > 1) {

    return {
      error:
        `Existem vários artistas com o nome "${name}". Use um nome artístico único.`
    };

  }


  const artist =
    data[0];


  if (
    artist.status &&
    artist.status !== "active"
  ) {

    return {
      error:
        "O artista encontrado não está ativo."
    };

  }


  return {
    artist
  };
}


/*
 * =========================================================
 * STORAGE
 * =========================================================
 */

async function uploadFile(
  file,
  folder,
  contentType
) {

  if (!file) {
    return null;
  }


  const bucket =
    process.env.RELEASES_BUCKET ||
    "releases";


  const originalName =
    safeFileName(
      file.originalFilename ||
      file.newFilename ||
      "arquivo"
    );


  const filePath =
    `${folder}/${Date.now()}-${originalName}`;


  const buffer =
    await fs.readFile(
      file.filepath
    );


  const {
    error
  } = await supabase
    .storage
    .from(bucket)
    .upload(
      filePath,
      buffer,
      {
        contentType:
          contentType ||
          file.mimetype ||
          "application/octet-stream",

        upsert: false
      }
    );


  if (error) {

    throw new Error(
      `Erro ao enviar arquivo para o Storage: ${error.message}`
    );

  }


  const {
    data
  } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(
      filePath
    );


  return {
    bucket,
    path: filePath,
    url:
      data?.publicUrl || null
  };
}


/*
 * =========================================================
 * VALIDAÇÃO DOS ARQUIVOS
 * =========================================================
 */

function validateFiles(
  audio,
  cover
) {

  if (!audio) {

    return "Selecione o arquivo de áudio.";

  }


  if (!cover) {

    return "Selecione a capa do lançamento.";

  }


  const audioExt =
    extension(
      audio.originalFilename
    );


  const coverExt =
    extension(
      cover.originalFilename
    );


  const validAudio = [
    "wav",
    "flac",
    "mp3"
  ];


  const validCover = [
    "jpg",
    "jpeg",
    "png"
  ];


  if (
    !validAudio.includes(
      audioExt
    )
  ) {

    return:
      "O áudio deve estar em WAV, FLAC ou MP3.";

  }


  if (
    !validCover.includes(
      coverExt
    )
  ) {

    return:
      "A capa deve estar em JPG, JPEG ou PNG.";

  }


  return null;
}


/*
 * =========================================================
 * GET
 * =========================================================
 */

async function getReleases(req, res) {

  const {
    id,
    status,
    per_page,
    limit
  } = req.query || {};


  let pageSize =
    parseInt(
      per_page ||
      limit ||
      "50",
      10
    );


  if (
    Number.isNaN(pageSize) ||
    pageSize <= 0
  ) {

    pageSize = 50;

  }


  if (pageSize > 100) {
    pageSize = 100;
  }


  let query =
    supabase
      .from("releases")
      .select(`
        id,
        artist_id,
        titulo,
        subtitulo,
        tipo,
        genero,
        genero_secundario,
        idioma,
        label,
        catalog_number,
        upc,
        ean,
        data_lancamento,
        data_original,
        capa_url,
        explicito,
        declaracao_ia,
        copyright_text,
        phonographic_copyright,
        descricao,
        status,
        motivo_rejeicao,
        labelgrid_release_id,
        validation_status,
        validation_result,
        distribution_status,
        distribution_result,
        criado_em,
        atualizado_em
      `)
      .order(
        "criado_em",
        {
          ascending: false
        }
      )
      .limit(pageSize);


  if (id) {

    query =
      query.eq(
        "id",
        id
      );

  }


  if (status) {

    query =
      query.eq(
        "status",
        status
      );

  }


  const {
    data,
    error
  } =
    await query;


  if (error) {

    console.error(
      "Erro ao buscar releases:",
      error
    );

    return res.status(500).json({

      success: false,

      error:
        `Erro ao buscar releases: ${error.message}`

    });

  }


  /*
   * Busca os artistas correspondentes.
   */

  const artistIds =
    [
      ...new Set(
        (data || [])
          .map(
            release =>
              release.artist_id
          )
          .filter(Boolean)
      )
    ];


  let artists = [];


  if (artistIds.length) {

    const {
      data: artistData,
      error: artistError
    } =
      await supabase
        .from("artists")
        .select(`
          id,
          nome_artistico
        `)
        .in(
          "id",
          artistIds
        );


    if (artistError) {

      console.error(
        "Erro ao buscar artistas:",
        artistError
      );

    } else {

      artists =
        artistData || [];

    }

  }


  const artistMap =
    new Map(
      artists.map(
        artist => [
          artist.id,
          artist
        ]
      )
    );


  /*
   * Formato amigável para o frontend.
   */

  const releases =
    (data || []).map(
      release => {

        const artist =
          artistMap.get(
            release.artist_id
          );


        return {

          ...release,

          title:
            release.titulo,

          artist_name:
            artist?.nome_artistico ||
            "Artista",

          artists:
            artist
              ? {
                  name:
                    artist.nome_artistico
                }
              : null

        };

      }
    );


  if (id) {

    if (!releases.length) {

      return res.status(404).json({

        success: false,

        error:
          "Release não encontrado."

      });

    }


    return res.status(200).json({

      success: true,

      data:
        releases[0]

    });

  }


  return res.status(200).json({

    success: true,

    count:
      releases.length,

    data:
      releases

  });

}


/*
 * =========================================================
 * POST
 * =========================================================
 */

async function createRelease(
  req,
  res
) {

  const {
    fields,
    files
  } =
    await parseMultipart(req);


  /*
   * Campos enviados pelo app.js
   */

  let releasePayload;


  try {

    releasePayload =
      JSON.parse(
        text(
          fields.release
        )
      );

  } catch (error) {

    return res.status(400).json({

      success: false,

      error:
        "O campo release não contém um JSON válido."

    });

  }


  /*
   * Dados principais
   */

  const title =
    text(
      releasePayload
        .titles?.[0]?.text
    );


  const description =
    text(
      releasePayload
        .descriptions?.[0]?.text
    );


  const artistName =
    text(
      releasePayload.artist_name
    );


  const contentType =
    text(
      releasePayload.content_type
    ) ||
    "Single";


  const genre =
    text(
      releasePayload.primary_genre
    );


  const releaseDate =
    text(
      releasePayload.original_release_date
    );


  const catalog =
    text(
      releasePayload.catalog_number
    );


  const explicit =
    Boolean(
      releasePayload.explicit
    );


  const aiDisclosure =
    Boolean(
      releasePayload.ai_disclosure
    );


  const platformIds =
    Array.isArray(
      releasePayload.platform_ids
    )
      ? [
          ...new Set(
            releasePayload.platform_ids
              .map(
                value =>
                  text(value)
              )
              .filter(Boolean)
          )
        ]
      : [];


  /*
   * Validação
   */

  if (!title) {

    return res.status(400).json({

      success: false,

      error:
        "Informe o título da música."

    });

  }


  if (!artistName) {

    return res.status(400).json({

      success: false,

      error:
        "Informe o artista principal."

    });

  }


  if (!genre) {

    return res.status(400).json({

      success: false,

      error:
        "Informe o gênero musical."

    });

  }


  if (!releaseDate) {

    return res.status(400).json({

      success: false,

      error:
        "Informe a data de lançamento."

    });

  }


  if (!platformIds.length) {

    return res.status(400).json({

      success: false,

      error:
        "Selecione pelo menos uma plataforma."

    });

  }


  /*
   * Arquivos
   */

  const audio =
    getFile(
      files.audio
    );


  const cover =
    getFile(
      files.cover
    );


  const fileError =
    validateFiles(
      audio,
      cover
    );


  if (fileError) {

    return res.status(400).json({

      success: false,

      error:
        fileError

    });

  }


  /*
   * Localiza artista
   */

  const artistResult =
    await findArtist(
      artistName
    );


  if (artistResult.error) {

    return res.status(400).json({

      success: false,

      error:
        artistResult.error

    });

  }


  const artist =
    artistResult.artist;


  /*
   * Confirma plataformas existentes
   */

  const {
    data: platforms,
    error: platformsError
  } =
    await supabase
      .from("platforms")
      .select(`
        id,
        nome,
        slug,
        ativo
      `)
      .in(
        "id",
        platformIds
      );


  if (platformsError) {

    return res.status(500).json({

      success: false,

      error:
        `Erro ao validar plataformas: ${platformsError.message}`

    });

  }


  const activePlatforms =
    (platforms || [])
      .filter(
        platform =>
          platform.ativo === true
      );


  if (
    activePlatforms.length !==
    platformIds.length
  ) {

    return res.status(400).json({

      success: false,

      error:
        "Uma ou mais plataformas selecionadas não existem ou estão inativas."

    });

  }


  /*
   * =======================================================
   * CRIA O RELEASE
   * =======================================================
   */

  const releaseInsert = {

    artist_id:
      artist.id,

    titulo:
      title,

    subtitulo:
      null,

    tipo:
      contentType.toLowerCase(),

    genero:
      genre,

    genero_secundario:
      null,

    idioma:
      "pt-BR",

    label:
      "Gonçalves Music",

    catalog_number:
      catalog || null,

    data_lancamento:
      releaseDate,

    data_original:
      releaseDate,

    explicito:
      explicit,

    declaracao_ia:
      aiDisclosure,

    descricao:
      description || null,

    status:
      "draft",

    validation_status:
      "pending",

    distribution_status:
      "pending"

  };


  const {
    data: release,
    error: releaseError
  } =
    await supabase
      .from("releases")
      .insert(
        releaseInsert
      )
      .select()
      .single();


  if (releaseError) {

    console.error(
      "Erro ao criar release:",
      releaseError
    );

    return res.status(500).json({

      success: false,

      error:
        `Erro ao criar lançamento: ${releaseError.message}`

    });

  }


  /*
   * =======================================================
   * UPLOAD DA CAPA
   * =======================================================
   */

  let coverUpload =
    null;


  try {

    coverUpload =
      await uploadFile(
        cover,
        `releases/${release.id}/cover`,
        cover.mimetype ||
          "image/jpeg"
      );


  } catch (error) {

    /*
     * Se a capa falhar, remove o release
     * para evitar registro incompleto.
     */

    await supabase
      .from("releases")
      .delete()
      .eq(
        "id",
        release.id
      );


    return res.status(500).json({

      success: false,

      error:
        error.message ||
        "Erro ao enviar a capa."

    });

  }


  /*
   * Atualiza URL da capa.
   */

  let updatedRelease =
    release;


  if (coverUpload?.url) {

    const {
      data,
      error
    } =
      await supabase
        .from("releases")
        .update({
          capa_url:
            coverUpload.url
        })
        .eq(
          "id",
          release.id
        )
        .select()
        .single();


    if (error) {

      console.error(
        "Erro ao atualizar capa:",
        error
      );

    } else {

      updatedRelease =
        data;

    }

  }


  /*
   * =======================================================
   * RELACIONAMENTO COM PLATAFORMAS
   * =======================================================
   */

  const platformRows =
    activePlatforms.map(
      platform => ({

        release_id:
          release.id,

        platform_id:
          platform.id,

        status:
          "pending"

      })
    );


  const {
    data: releasePlatforms,
    error: releasePlatformsError
  } =
    await supabase
      .from("release_platforms")
      .insert(
        platformRows
      )
      .select();


  if (releasePlatformsError) {

    console.error(
      "Erro ao criar plataformas do release:",
      releasePlatformsError
    );


    /*
     * Não apagamos automaticamente o release
     * porque a capa já foi enviada.
     *
     * O release fica registrado para correção.
     */

    return res.status(500).json({

      success: false,

      error:
        `Lançamento criado, mas ocorreu um erro ao registrar as plataformas: ${releasePlatformsError.message}`,

      id:
        release.id,

      release:
        updatedRelease

    });

  }


  /*
   * =======================================================
   * UPLOAD DO ÁUDIO
   * =======================================================
   *
   * A tabela releases não possui audio_url.
   *
   * Por isso o áudio é enviado ao Storage e a URL
   * é retornada para a próxima etapa de integração
   * com a tabela tracks.
   */

  let audioUpload =
    null;


  try {

    audioUpload =
      await uploadFile(
        audio,
        `releases/${release.id}/audio`,
        audio.mimetype ||
          "audio/mpeg"
      );

  } catch (error) {

    console.error(
      "Erro ao enviar áudio:",
      error
    );


    /*
     * O release continua criado porque os metadados,
     * capa e plataformas já foram gravados.
     */

    return res.status(500).json({

      success: false,

      error:
        `Lançamento criado, mas não foi possível enviar o áudio: ${error.message}`,

      id:
        release.id,

      release:
        updatedRelease,

      platforms:
        releasePlatforms || []

    });

  }


  /*
   * =======================================================
   * RESPOSTA
   * =======================================================
   */

  return res.status(201).json({

    success: true,

    message:
      "Lançamento criado com sucesso.",

    id:
      release.id,

    release:
      updatedRelease,

    platforms:
      releasePlatforms || [],

    files: {

      cover:
        coverUpload
          ? {
              url:
                coverUpload.url,
              path:
                coverUpload.path
            }
          : null,

      audio:
        audioUpload
          ? {
              url:
                audioUpload.url,
              path:
                audioUpload.path
            }
          : null

    }

  });

}


/*
 * =========================================================
 * HANDLER PRINCIPAL
 * =========================================================
 */

export default async function handler(
  req,
  res
) {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );


  try {

    /*
     * GET
     */

    if (req.method === "GET") {

      return await getReleases(
        req,
        res
      );

    }


    /*
     * POST
     */

    if (req.method === "POST") {

      return await createRelease(
        req,
        res
      );

    }


    /*
     * Outros métodos
     */

    res.setHeader(
      "Allow",
      "GET, POST"
    );


    return res.status(405).json({

      success: false,

      error:
        "Método não permitido."

    });

  } catch (error) {

    console.error(
      "Releases API:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        error?.message ||
        "Erro interno da API."

    });

  }

}
```
