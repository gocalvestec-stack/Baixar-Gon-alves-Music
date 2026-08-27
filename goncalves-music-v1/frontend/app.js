/* =========================================================
   GONÇALVES MUSIC V1
   app.js
   Distribuição Digital
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const API_BASE = "";

const MAX_AUDIO_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_COVER_SIZE = 20 * 1024 * 1024;  // 20 MB

const ALLOWED_AUDIO_TYPES = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/flac",
  "audio/mpeg",
  "audio/mp3"
];

const ALLOWED_AUDIO_EXTENSIONS = [
  ".wav",
  ".flac",
  ".mp3"
];

const ALLOWED_COVER_TYPES = [
  "image/jpeg",
  "image/png"
];

const ALLOWED_COVER_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png"
];


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]
  );
}


function getExtension(filename) {
  const name = String(filename || "").toLowerCase();
  const index = name.lastIndexOf(".");

  return index >= 0
    ? name.slice(index)
    : "";
}


function formatBytes(bytes) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}


function formatDate(date) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("pt-BR").format(
      new Date(date + "T00:00:00")
    );
  } catch {
    return date;
  }
}


function setMessage(message, type = "") {
  const element = $("#formMessage");

  if (!element) return;

  element.textContent = message;
  element.className = `message ${type}`.trim();
}


function setButtonLoading(button, loading, loadingText = "Processando...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.textContent =
      button.dataset.originalText || "Criar lançamento";
  }
}


/* =========================================================
   API
   ========================================================= */

async function api(url, options = {}) {

  const config = {
    method: options.method || "GET",
    ...options
  };

  /*
   * Se o body for FormData NÃO devemos colocar
   * Content-Type manualmente.
   *
   * O navegador adicionará:
   * multipart/form-data; boundary=...
   */

  if (!(config.body instanceof FormData)) {

    config.headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

  } else {

    config.headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

  }


  const response = await fetch(
    `${API_BASE}${url}`,
    config
  );


  const contentType =
    response.headers.get("content-type") || "";


  let data = {};

  if (contentType.includes("application/json")) {

    data = await response
      .json()
      .catch(() => ({}));

  } else {

    const text = await response
      .text()
      .catch(() => "");

    data = text
      ? { message: text }
      : {};

  }


  if (!response.ok) {

    const errorMessage =
      data.error ||
      data.message ||
      `Erro HTTP ${response.status}`;

    throw new Error(errorMessage);
  }


  return data;
}


/* =========================================================
   HEALTH CHECK
   ========================================================= */

async function health() {

  const badge = $("#apiBadge");

  if (!badge) return;

  badge.textContent = "API verificando...";
  badge.className = "badge";


  try {

    const data = await api("/api/health");

    if (data.labelgridConfigured) {

      badge.textContent = "API conectada";

    } else {

      badge.textContent = "API conectada · Token pendente";
    }


    badge.classList.add("online");

  } catch (error) {

    console.error("Health check:", error);

    badge.textContent = "Backend offline";
    badge.classList.add("offline");
  }
}


/* =========================================================
   VALIDAÇÃO DE ÁUDIO
   ========================================================= */

function validateAudio(file) {

  if (!file) {
    return {
      valid: false,
      error: "Selecione um arquivo de áudio."
    };
  }


  const extension =
    getExtension(file.name);


  const validType =
    ALLOWED_AUDIO_TYPES.includes(file.type);


  const validExtension =
    ALLOWED_AUDIO_EXTENSIONS.includes(extension);


  if (!validType && !validExtension) {

    return {
      valid: false,
      error: "Formato de áudio inválido. Use WAV, FLAC ou MP3."
    };
  }


  if (file.size > MAX_AUDIO_SIZE) {

    return {
      valid: false,
      error:
        `O áudio é muito grande. ` +
        `Limite: ${formatBytes(MAX_AUDIO_SIZE)}.`
    };
  }


  return {
    valid: true
  };
}


/* =========================================================
   VALIDAÇÃO DE CAPA
   ========================================================= */

function validateCover(file) {

  if (!file) {
    return {
      valid: false,
      error: "Selecione uma capa."
    };
  }


  const extension =
    getExtension(file.name);


  const validType =
    ALLOWED_COVER_TYPES.includes(file.type);


  const validExtension =
    ALLOWED_COVER_EXTENSIONS.includes(extension);


  if (!validType && !validExtension) {

    return {
      valid: false,
      error: "Formato da capa inválido. Use JPG ou PNG."
    };
  }


  if (file.size > MAX_COVER_SIZE) {

    return {
      valid: false,
      error:
        `A capa é muito grande. ` +
        `Limite: ${formatBytes(MAX_COVER_SIZE)}.`
    };
  }


  return {
    valid: true
  };
}


/* =========================================================
   VISUALIZAÇÃO DOS ARQUIVOS
   ========================================================= */

function updateAudioInfo(file) {

  const element = $("#audioName");

  if (!element) return;


  if (!file) {

    element.textContent =
      "WAV/FLAC recomendado";

    return;
  }


  const validation =
    validateAudio(file);


  if (!validation.valid) {

    element.textContent =
      validation.error;

    element.classList.add("error");

    return;
  }


  element.classList.remove("error");

  element.textContent =
    `${file.name} · ${formatBytes(file.size)}`;
}


function updateCoverInfo(file) {

  const element = $("#coverName");

  if (!element) return;


  if (!file) {

    element.textContent =
      "JPG/PNG";

    return;
  }


  const validation =
    validateCover(file);


  if (!validation.valid) {

    element.textContent =
      validation.error;

    element.classList.add("error");

    return;
  }


  element.classList.remove("error");

  element.textContent =
    `${file.name} · ${formatBytes(file.size)}`;
}


/* =========================================================
   ARTISTA
   ========================================================= */

function getArtistName(formData) {

  const artist =
    formData.get("artist");

  return String(artist || "").trim();
}


/* =========================================================
   PAYLOAD DO LANÇAMENTO
   ========================================================= */

function buildReleasePayload(formData) {

  const title =
    String(formData.get("title") || "").trim();

  const artist =
    String(formData.get("artist") || "").trim();

  const description =
    String(formData.get("description") || "").trim();

  const contentType =
    String(formData.get("content_type") || "Single");

  const genre =
    String(formData.get("genre") || "").trim();

  const releaseDate =
    String(formData.get("release_date") || "").trim();

  const catalog =
    String(formData.get("catalog") || "").trim();


  return {

    titles: [
      {
        iso_code: "pt-BR",
        text: title
      }
    ],

    descriptions: description
      ? [
          {
            iso_code: "pt-BR",
            text: description
          }
        ]
      : [],

    content_type: contentType,

    catalog_number: catalog,

    original_release_date: releaseDate,

    primary_genre: genre,

    explicit:
      Boolean($("#explicit")?.checked),

    ai_disclosure:
      Boolean($("#aiDisclosure")?.checked),

    /*
     * Artista principal.
     *
     * O backend poderá transformar esse nome
     * em artist_id posteriormente.
     */

    artist_name: artist
  };
}


/* =========================================================
   CRIAR LANÇAMENTO
   ========================================================= */

async function createRelease() {

  const form = $("#releaseForm");

  if (!form) return;


  const formData =
    new FormData(form);


  const audio =
    $("#audio")?.files?.[0] || null;

  const cover =
    $("#cover")?.files?.[0] || null;


  /* -----------------------------------------
     VALIDA CAMPOS
     ----------------------------------------- */

  const title =
    String(formData.get("title") || "").trim();

  const artist =
    getArtistName(formData);

  const genre =
    String(formData.get("genre") || "").trim();

  const releaseDate =
    String(formData.get("release_date") || "").trim();


  if (!title) {

    setMessage(
      "Informe o título da música.",
      "error"
    );

    return;
  }


  if (!artist) {

    setMessage(
      "Informe o artista principal.",
      "error"
    );

    return;
  }


  if (!genre) {

    setMessage(
      "Informe o gênero musical.",
      "error"
    );

    return;
  }


  if (!releaseDate) {

    setMessage(
      "Informe a data de lançamento.",
      "error"
    );

    return;
  }


  /* -----------------------------------------
     VALIDA ÁUDIO
     ----------------------------------------- */

  const audioValidation =
    validateAudio(audio);


  if (!audioValidation.valid) {

    setMessage(
      audioValidation.error,
      "error"
    );

    return;
  }


  /* -----------------------------------------
     VALIDA CAPA
     ----------------------------------------- */

  const coverValidation =
    validateCover(cover);


  if (!coverValidation.valid) {

    setMessage(
      coverValidation.error,
      "error"
    );

    return;
  }


  /* -----------------------------------------
     MONTA PAYLOAD
     ----------------------------------------- */

  const payload =
    buildReleasePayload(formData);


  /*
   * O backend receberá os dados e os arquivos
   * como multipart/form-data.
   */

  const uploadData =
    new FormData();


  uploadData.append(
    "release",
    JSON.stringify(payload)
  );


  uploadData.append(
    "artist_name",
    artist
  );


  uploadData.append(
    "audio",
    audio
  );


  uploadData.append(
    "cover",
    cover
  );


  /* -----------------------------------------
     ENVIA
     ----------------------------------------- */

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );


  setButtonLoading(
    submitButton,
    true,
    "Enviando lançamento..."
  );


  setMessage(
    "Enviando lançamento..."
  );


  try {

    const created =
      await api(
        "/api/releases",
        {
          method: "POST",
          body: uploadData
        }
      );


    const releaseId =
      created.id ||
      created.public_id ||
      created.release?.id ||
      created.release?.public_id ||
      "OK";


    setMessage(
      `Lançamento criado com sucesso. ID: ${releaseId}`,
      "success"
    );


    /*
     * Atualiza catálogo.
     */

    await loadReleases();


    /*
     * Limpa formulário depois do sucesso.
     */

    form.reset();


    /*
     * Mantém a data atual depois do reset.
     */

    setDefaultReleaseDate();


    updateAudioInfo(null);
    updateCoverInfo(null);


  } catch (error) {

    console.error(
      "Erro ao criar lançamento:",
      error
    );


    setMessage(
      error.message ||
      "Não foi possível criar o lançamento.",
      "error"
    );


  } finally {

    setButtonLoading(
      submitButton,
      false
    );
  }
}


/* =========================================================
   CATÁLOGO
   ========================================================= */

function renderReleases(data) {

  const list =
    $("#releases");


  if (!list) return;


  /*
   * Compatibilidade com diferentes formatos
   * de resposta da API.
   */

  const items =
    Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.releases)
          ? data.releases
          : [];


  if (!items.length) {

    list.innerHTML =
      '<div class="empty">Nenhum lançamento encontrado.</div>';

    return;
  }


  list.innerHTML =
    items.map((release) => {

      const title =
        release.titles?.[0]?.text ||
        release.title ||
        release.name ||
        "Sem título";


      const artist =
        release.artists?.name ||
        release.artists?.[0]?.name ||
        release.artist_name ||
        release.artist ||
        "Artista";


      const id =
        release.public_id ||
        release.id ||
        "—";


      const status =
        release.status ||
        release.distribution_status ||
        "CATÁLOGO";


      const date =
        release.original_release_date ||
        release.release_date ||
        "";


      return `
        <article class="release">

          <div class="release-info">

            <h3>
              ${escapeHtml(title)}
            </h3>

            <p>
              ${escapeHtml(String(artist))}
              · ID
              ${escapeHtml(String(id))}
            </p>

            ${
              date
                ? `<small>
                    Lançamento:
                    ${escapeHtml(formatDate(date))}
                   </small>`
                : ""
            }

          </div>

          <span class="status">
            ${escapeHtml(String(status))}
          </span>

        </article>
      `;

    }).join("");
}


/* =========================================================
   CARREGAR LANÇAMENTOS
   ========================================================= */

async function loadReleases() {

  const list =
    $("#releases");


  if (!list) return;


  list.innerHTML =
    '<div class="empty">Carregando...</div>';


  try {

    const data =
      await api(
        "/api/releases?per_page=50"
      );


    renderReleases(data);


  } catch (error) {

    console.error(
      "Erro ao carregar lançamentos:",
      error
    );


    list.innerHTML =
      `<div class="empty">
        ${escapeHtml(error.message)}
       </div>`;
  }
}


/* =========================================================
   DATA PADRÃO
   ========================================================= */

function setDefaultReleaseDate() {

  const input =
    $('input[name="release_date"]');


  if (!input) return;


  const today =
    new Date();


  /*
   * Ajusta para o horário local,
   * evitando problemas de UTC.
   */

  const year =
    today.getFullYear();


  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");


  const day =
    String(
      today.getDate()
    ).padStart(2, "0");


  input.value =
    `${year}-${month}-${day}`;
}


/* =========================================================
   ANO DO RODAPÉ
   ========================================================= */

function setCurrentYear() {

  const year =
    $("#year");


  if (!year) return;


  year.textContent =
    new Date().getFullYear();
}


/* =========================================================
   EVENTOS DOS ARQUIVOS
   ========================================================= */

function setupFileInputs() {

  const audio =
    $("#audio");


  if (audio) {

    audio.addEventListener(
      "change",
      (event) => {

        const file =
          event.target.files?.[0] || null;

        updateAudioInfo(file);
      }
    );
  }


  const cover =
    $("#cover");


  if (cover) {

    cover.addEventListener(
      "change",
      (event) => {

        const file =
          event.target.files?.[0] || null;

        updateCoverInfo(file);
      }
    );
  }
}


/* =========================================================
   FORMULÁRIO
   ========================================================= */

function setupForm() {

  const form =
    $("#releaseForm");


  if (!form) return;


  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      await createRelease();
    }
  );
}


/* =========================================================
   BOTÃO ATUALIZAR
   ========================================================= */

function setupRefresh() {

  const button =
    $("#refresh");


  if (!button) return;


  button.addEventListener(
    "click",
    async () => {

      button.disabled = true;

      const originalText =
        button.textContent;

      button.textContent =
        "Atualizando...";


      try {

        await loadReleases();

      } finally {

        button.disabled = false;

        button.textContent =
          originalText;
      }
    }
  );
}


/* =========================================================
   NAVEGAÇÃO SUAVE
   ========================================================= */

function setupSmoothNavigation() {

  $$('a[href^="#"]').forEach(
    (link) => {

      link.addEventListener(
        "click",
        (event) => {

          const targetId =
            link.getAttribute("href");


          if (!targetId ||
              targetId === "#") {

            return;
          }


          const target =
            document.querySelector(
              targetId
            );


          if (!target) return;


          event.preventDefault();


          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      );
    }
  );
}


/* =========================================================
   PREVENÇÃO DE ENVIO DUPLO
   ========================================================= */

function preventDoubleSubmit() {

  const form =
    $("#releaseForm");


  if (!form) return;


  form.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter" &&
        event.target.tagName !== "TEXTAREA"
      ) {

        event.preventDefault();
      }
    }
  );
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function init() {

  console.log(
    "🎵 Gonçalves Music V1 iniciando..."
  );


  setCurrentYear();

  setDefaultReleaseDate();

  setupFileInputs();

  setupForm();

  setupRefresh();

  setupSmoothNavigation();

  preventDoubleSubmit();


  /*
   * Executa em paralelo.
   */

  await Promise.allSettled([
    health(),
    loadReleases()
  ]);


  console.log(
    "🎵 Gonçalves Music V1 pronta."
  );
}


/* =========================================================
   START
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();
}
/* =========================================================
   PLATAFORMAS
   ========================================================= */

let availablePlatforms = [];


/**
 * Carrega as plataformas ativas da API.
 */
async function loadPlatforms() {

  const container = $("#platforms");

  if (!container) return;

  container.innerHTML =
    '<div class="empty">Carregando plataformas...</div>';

  try {

    const response =
      await api("/api/platforms");

    availablePlatforms =
      Array.isArray(response?.data)
        ? response.data
        : [];

    renderPlatforms();

  } catch (error) {

    console.error(
      "Erro ao carregar plataformas:",
      error
    );

    container.innerHTML =
      `<div class="empty">
        ${escapeHtml(
          error.message ||
          "Não foi possível carregar as plataformas."
        )}
      </div>`;
  }
}


/**
 * Mostra as plataformas na tela.
 */
function renderPlatforms() {

  const container =
    $("#platforms");

  if (!container) return;


  if (!availablePlatforms.length) {

    container.innerHTML =
      '<div class="empty">Nenhuma plataforma disponível.</div>';

    return;
  }


  container.innerHTML =
    availablePlatforms.map(platform => {

      const id =
        String(platform.id);

      const name =
        platform.nome ||
        platform.name ||
        "Plataforma";

      const slug =
        platform.slug ||
        "";


      return `
        <label class="platform-card">

          <input
            type="checkbox"
            name="platform_ids"
            value="${escapeHtml(id)}"
            data-slug="${escapeHtml(slug)}"
          >

          <span class="platform-content">

            ${
              platform.logo_url
                ? `
                  <img
                    src="${escapeHtml(platform.logo_url)}"
                    alt="${escapeHtml(name)}"
                    class="platform-logo"
                    loading="lazy"
                  >
                `
                : `
                  <span class="platform-icon">
                    🎵
                  </span>
                `
            }

            <span class="platform-name">
              ${escapeHtml(name)}
            </span>

          </span>

        </label>
      `;

    }).join("");
}


/**
 * Retorna os IDs das plataformas selecionadas.
 */
function getSelectedPlatformIds() {

  return Array.from(
    document.querySelectorAll(
      'input[name="platform_ids"]:checked'
    )
  ).map(
    input => input.value
  );
}
