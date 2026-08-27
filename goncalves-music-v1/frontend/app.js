const $ = (s) => document.querySelector(s);

$("#year").textContent = new Date().getFullYear();
$("#release_date").value = new Date().toISOString().slice(0,10);

async function api(url, options = {}) {
  const r = await fetch(url, {
    headers: {"Content-Type":"application/json", ...(options.headers || {})},
    ...options
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Erro na API");
  return data;
}

async function health() {
  try {
    const data = await api("/api/health");
    $("#apiBadge").textContent = data.labelgridConfigured
      ? "LabelGrid configurada"
      : "Token não configurado";
  } catch {
    $("#apiBadge").textContent = "Backend offline";
  }
}

function renderReleases(data) {
  const list = $("#releases");
  const items = data?.data || [];
  if (!items.length) {
    list.innerHTML = '<div class="empty">Nenhum lançamento encontrado.</div>';
    return;
  }
  list.innerHTML = items.map(r => {
    const title = r.titles?.[0]?.text || "Sem título";
    const artist = r.artists?.name || r.artists?.[0]?.name || "Artista";
    const id = r.public_id || r.id;
    return `<div class="release">
      <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(String(artist))} · ID ${escapeHtml(String(id))}</p></div>
      <span class="status">CATÁLOGO</span>
    </div>`;
  }).join("");
}

function escapeHtml(v) {
  return v.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

async function loadReleases() {
  $("#releases").innerHTML = '<div class="empty">Carregando...</div>';
  try {
    renderReleases(await api("/api/releases?per_page=50"));
  } catch (e) {
    $("#releases").innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

$("#audio").addEventListener("change", e => {
  $("#audioName").textContent = e.target.files[0]?.name || "WAV/FLAC recomendado";
});
$("#cover").addEventListener("change", e => {
  $("#coverName").textContent = e.target.files[0]?.name || "JPG/PNG";
});

$("#releaseForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("#formMessage");
  msg.textContent = "Criando lançamento...";

  const f = new FormData(e.target);
  const payload = {
    titles: [{iso_code: "pt-BR", text: f.get("title")}],
    descriptions: f.get("description") ? [{iso_code: "pt-BR", text: f.get("description")}] : [],
    content_type: f.get("content_type"),
    catalog_number: f.get("catalog"),
    original_release_date: f.get("release_date"),
    primary_genre: f.get("genre"),
    explicit: $("#explicit").checked,
    ai_disclosure: $("#aiDisclosure").checked
  };

  try {
    const created = await api("/api/releases", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    msg.textContent = `Lançamento criado. ID: ${created.id || created.public_id || "OK"}`;
    await loadReleases();
  } catch (err) {
    msg.textContent = err.message;
  }
});

$("#refresh").addEventListener("click", loadReleases);
health();
loadReleases();
