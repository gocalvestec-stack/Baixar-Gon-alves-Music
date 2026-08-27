"use strict";

/* =========================================================
   GONÇALVES MUSIC — APP.JS V1
   ========================================================= */


/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
  return document.querySelector(selector);
}


function escapeHtml(value) {

  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char])
  );
}


function setMessage(message, type = "") {

  const element = $("#formMessage");

  if (!element) return;

  element.textContent = message;

  element.className = "message";

  if (type) {
    element.classList.add(type);
  }
}


/* =========================================================
   API
   ========================================================= */

async function api(url, options = {}) {

  const config = {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : {
            "Content-Type": "application/json"
          }),

      ...(options.headers || {})
    }
  };


  const response =
    await fetch(url, config);


  const data =
    await response
      .json()
      .catch(() => ({}));


  if (!response.ok) {

    throw new Error(
      data.error ||
      data.message ||
      `Erro HTTP ${response.status}`
    );
  }


  return data;
}


/* =========================================================
   HEALTH CHECK
   ========================================================= */

async function health() {

  const badge =
    $("#apiBadge");

  if (!badge) return;


  badge.textContent =
    "API verificando...";


  try {

    const data =
      await api("/api/health");


    if (data.ok) {

      if (data.labelgridConfigured) {

        badge.textContent =
          "API online • LabelGrid configurada";

      } else {

        badge.textContent =
          "API online • Token não configurado";
      }

      badge.classList.add("online");

    } else {

      badge.textContent =
        data.message ||
        "API com erro";

      badge.classList.add("error");
    }

  } catch (error) {

    console.error(
      "Health:",
      error
    );

    badge.textContent =
      "Backend offline";

    badge.classList.add("error");
  }
}


/* =========================================================
   PLATAFORMAS
   ========================================================= */

let availablePlatforms = [];


async function loadPlatforms() {

  const container =
    $("#platforms");

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


function renderPlatforms() {

  const container =
    $("#platforms");

  if (!container) return;


  if (!availablePlatforms.length) {

    container.innerHTML =
      `<div class="empty">
        Nenhuma plataforma disponível.
      </div>`;

    return;
  }


  container.innerHTML =
    availablePlatforms
      .map(platform => {

        const id =
          String(platform.id);


        const name =
          platform.nome ||
          platform.name ||
          "Plataforma";


        const slug =
          platform.slug ||
          "";


        const logo =
          platform.logo_url ||
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
                logo
                  ? `
                    <img
                      src="${escapeHtml(logo)}"
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

      })
      .join("");
}


function getSelectedPlatformIds() {

  return Array.from(
    document.querySelectorAll(
      'input[name="platform_ids"]:checked'
    )
  ).map(
    input => input.value
  );
}


/* =========================================================
   PAYLOAD
   ========================================================= */

function buildReleasePayload(formData) {

  const title =
    String(
      formData.get("title") || ""
    ).trim();


  const artist =
    String(
      formData.get("artist") || ""
    ).trim();


  const description =
    String(
      formData.get("description") || ""
    ).trim();


  const contentType =
    String(
      formData.get("content_type") ||
      "Single"
    );


  const genre =
    String(
      formData.get("genre") || ""
    ).trim();


  const releaseDate =
    String(
      formData.get("release_date") || ""
    ).trim();


  const catalog =
    String(
      formData.get("catalog") || ""
    ).trim();


  const platformIds =
    getSelectedPlatformIds();


  return {

    titles: [
      {
        iso_code: "pt-BR",
        text: title
      }
    ],

    descriptions:
      description
        ? [
            {
              iso_code: "pt-BR",
              text: description
            }
          ]
        : [],

    content_type:
      contentType,

    catalog_number:
      catalog,

    original_release_date:
      releaseDate,

    primary_genre:
      genre,

    explicit:
      Boolean(
        $("#explicit")?.checked
      ),

    ai_disclosure:
      Boolean(
        $("#aiDisclosure")?.checked
      ),

    artist_name:
      artist,

    platform_ids:
      platformIds
  };
}


/* =========================================================
   ARQUIVOS
   ========================================================= */

function setupFileInputs() {

  const audio =
    $("#audio");


  const cover =
    $("#cover");


  if (audio) {

    audio.addEventListener(
      "change",
      event => {

        const file =
          event.target.files?.[0];


        const name =
          $("#audioName");


        if (!name) return;


        name.textContent =
          file
            ? `${file.name} • ${formatFileSize(file.size)}`
            : "WAV/FLAC recomendado";
      }
    );
  }


  if (cover) {

    cover.addEventListener(
      "change",
      event => {

        const file =
          event.target.files?.[0];


        const name =
          $("#coverName");


        if (!name) return;


        name.textContent =
          file
            ? `${file.name} • ${formatFileSize(file.size)}`
            : "JPG/PNG";
      }
    );
  }
}


function formatFileSize(bytes) {

  if (!bytes) return "0 KB";


  const mb =
    bytes / 1024 / 1024;


  if (mb >= 1) {

    return `${mb.toFixed(2)} MB`;

  }


  return `${Math.ceil(bytes / 1024)} KB`;
}


/* =========================================================
   VALIDAÇÃO
   ========================================================= */

function validateRelease(formData) {

  const title =
    String(
      formData.get("title") || ""
    ).trim();


  const artist =
    String(
      formData.get("artist") || ""
    ).trim();


  const genre =
    String(
      formData.get("genre") || ""
    ).trim();


  const date =
    String(
      formData.get("release_date") || ""
    ).trim();


  const audio =
    $("#audio")?.files?.[0];


  const cover =
    $("#cover")?.files?.[0];


  const platforms =
    getSelectedPlatformIds();


  if (!title) {

    return "Informe o título da música.";
  }


  if (!artist) {

    return "Informe o artista principal.";
  }


  if (!genre) {

    return "Informe o gênero musical.";
  }


  if (!date) {

    return "Informe a data de lançamento.";
  }


  if (!audio) {

    return "Selecione o arquivo de áudio.";
  }


  if (!cover) {

    return "Selecione a capa do lançamento.";
  }


  if (!platforms.length) {

    return "Selecione pelo menos uma plataforma de distribuição.";
  }


  const audioExtension =
    audio.name
      .toLowerCase()
      .split(".")
      .pop();


  const validAudio =
    ["wav", "flac", "mp3"];


  if (!validAudio.includes(audioExtension)) {

    return "O áudio deve estar em WAV, FLAC ou MP3.";
  }


  const coverExtension =
    cover.name
      .toLowerCase()
      .split(".")
      .pop();


  const validCover =
    ["jpg", "jpeg", "png"];


  if (!validCover.includes(coverExtension)) {

    return "A capa deve estar em JPG ou PNG.";
  }


  return null;
}


/* =========================================================
   CRIAÇÃO DO LANÇAMENTO
   ========================================================= */

async function createRelease(form) {

  const message =
    $("#formMessage");


  const formData =
    new FormData(form);


  const validationError =
    validateRelease(formData);


  if (validationError) {

    setMessage(
      validationError,
      "error"
    );

    return;
  }


  const payload =
    buildReleasePayload(formData);


  const audio =
    $("#audio").files[0];


  const cover =
    $("#cover").files[0];


  /*
   * O backend recebe os metadados
   * como JSON dentro de "release".
   */

  const uploadData =
    new FormData();


  uploadData.append(
    "release",
    JSON.stringify(payload)
  );


  uploadData.append(
    "audio",
    audio,
    audio.name
  );


  uploadData.append(
    "cover",
    cover,
    cover.name
  );


  /*
   * Estado visual
   */

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );


  if (submitButton) {

    submitButton.disabled =
      true;

    submitButton.textContent =
      "Criando lançamento...";
  }


  setMessage(
    "Enviando música, capa e informações...",
    ""
  );


  try {

    const result =
      await api(
        "/api/releases",
        {
          method: "POST",
          body: uploadData
        }
      );


    const releaseId =
      result.id ||
      result.public_id ||
      result.release?.id ||
      "OK";


    setMessage(
      `Lançamento criado com sucesso! ID: ${releaseId}`,
      "success"
    );


    /*
     * Limpa formulário.
     */

    form.reset();


    const audioName =
      $("#audioName");


    const coverName =
      $("#coverName");


    if (audioName) {

      audioName.textContent =
        "WAV/FLAC recomendado";
    }


    if (coverName) {

      coverName.textContent =
        "JPG/PNG";
    }


    /*
     * Atualiza catálogo.
     */

    await loadReleases();


  } catch (error) {

    console.error(
      "Create release:",
      error
    );


    setMessage(
      error.message ||
      "Não foi possível criar o lançamento.",
      "error"
    );


  } finally {

    if (submitButton) {

      submitButton.disabled =
        false;

      submitButton.textContent =
        "Criar lançamento";
    }
  }
}


/* =========================================================
   CATÁLOGO
   ========================================================= */

function renderReleases(data) {

  const list =
    $("#releases");

  if (!list) return;


  const items =
    Array.isArray(data?.data)
      ? data.data
      : [];


  if (!items.length) {

    list.innerHTML =
      '<div class="empty">Nenhum lançamento encontrado.</div>';

    return;
  }


  list.innerHTML =
    items
      .map(release => {

        const title =
          release.titles?.[0]?.text ||
          release.title ||
          "Sem título";


        let artist =
          release.artists?.name ||
          release.artists?.[0]?.name ||
          release.artist_name ||
          release.artist?.nome ||
          "Artista";


        if (
          typeof artist === "object"
        ) {

          artist =
            artist.nome ||
            artist.name ||
            "Artista";
        }


        const id =
          release.public_id ||
          release.id ||
          "";


        const status =
          release.status ||
          "CATÁLOGO";


        return `
          <div class="release">

            <div>

              <h3>
                ${escapeHtml(title)}
              </h3>

              <p>
                ${escapeHtml(String(artist))}
                · ID
                ${escapeHtml(String(id))}
              </p>

            </div>

            <span class="status">
              ${escapeHtml(
                String(status).toUpperCase()
              )}
            </span>

          </div>
        `;

      })
      .join("");
}


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
      "Releases:",
      error
    );


    list.innerHTML =
      `<div class="empty">
        ${escapeHtml(
          error.message ||
          "Erro ao carregar lançamentos."
        )}
      </div>`;
  }
}


/* =========================================================
   DATA PADRÃO
   ========================================================= */

function setupDefaultDate() {

  const dateInput =
    document.querySelector(
      'input[name="release_date"]'
    );


  if (!dateInput) return;


  if (!dateInput.value) {

    const now =
      new Date();


    const localDate =
      new Date(
        now.getTime() -
        now.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 10);


    dateInput.value =
      localDate;
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
    async event => {

      event.preventDefault();

      await createRelease(form);
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

      button.disabled =
        true;

      button.textContent =
        "Atualizando...";


      try {

        await Promise.all([
          loadReleases(),
          loadPlatforms(),
          health()
        ]);

      } finally {

        button.disabled =
          false;

        button.textContent =
          "Atualizar";
      }
    }
  );
}


/* =========================================================
   ANO
   ========================================================= */

function setupYear() {

  const year =
    $("#year");

  if (!year) return;


  year.textContent =
    new Date().getFullYear();
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function init() {

  setupYear();

  setupDefaultDate();

  setupFileInputs();

  setupForm();

  setupRefresh();


  /*
   * Carrega tudo ao abrir a página.
   */

  await Promise.allSettled([

    health(),

    loadPlatforms(),

    loadReleases()

  ]);

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
