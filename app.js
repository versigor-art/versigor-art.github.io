const FEED_URL = "https://artist-visual-archive.estifo-mtk.chatgpt.site/api/public/artworks";
const STORAGE_KEY = "nocturne-saved";
const OWNER_STUDIO_KEY = "versigor-owner-studio";

const fallbackArtworks = [];

const state = {
  artworks: fallbackArtworks,
  filter: "All",
  saved: readSaved(),
  selected: null
};

const gallery = document.querySelector("[data-gallery]");
const empty = document.querySelector("[data-empty]");
const count = document.querySelector("[data-count]");
const savedCount = document.querySelector("[data-saved-count]");
const lightbox = document.querySelector("[data-lightbox]");
const about = document.querySelector("[data-about]");

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeSaved() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved));
}

function initializeOwnerStudio() {
  const studioLink = document.querySelector("[data-owner-studio]");
  if (!studioLink) return;

  const url = new URL(window.location.href);
  let ownerToolsEnabled = false;

  try {
    if (url.searchParams.get("owner") === "1") {
      localStorage.setItem(OWNER_STUDIO_KEY, "enabled");
      ownerToolsEnabled = true;
      url.searchParams.delete("owner");
      window.history.replaceState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    } else {
      ownerToolsEnabled =
        localStorage.getItem(OWNER_STUDIO_KEY) === "enabled";
    }
  } catch {
    ownerToolsEnabled = url.searchParams.get("owner") === "1";
  }

  studioLink.hidden = !ownerToolsEnabled;
}

function bookmarkIcon(filled) {
  return `<svg viewBox="0 0 24 28" aria-hidden="true" class="bookmark-icon"><path d="M3 2.5h18v23L12 20l-9 5.5v-23Z" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" /></svg>`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function artworkTitle(artwork) {
  return String(artwork?.title || "").trim() || "Untitled";
}

function artworkMeta(...values) {
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" · ");
}

function filteredArtworks() {
  if (state.filter === "All") return state.artworks;
  if (state.filter === "Saved") return state.artworks.filter((artwork) => state.saved.includes(artwork.id));
  return state.artworks.filter((artwork) => artwork.category === state.filter);
}

function renderFeatured() {
  const featured = state.artworks.find((artwork) => artwork.featured) || state.artworks[0];
  const button = document.querySelector("[data-featured]");
  const image = document.querySelector("[data-featured-image]");
  const title = document.querySelector("[data-featured-title]");
  const detail = document.querySelector("[data-featured-detail]");

  if (!featured) {
    button.hidden = true;
    image.removeAttribute("src");
    image.alt = "";
    title.textContent = "";
    detail.textContent = "";
    button.onclick = null;
    return;
  }

  const displayTitle = artworkTitle(featured);
  button.hidden = false;
  image.src = featured.image;
  image.alt = `${displayTitle} artwork`;
  title.textContent = displayTitle;
  detail.textContent = artworkMeta(featured.medium, featured.year);
  button.setAttribute("aria-label", `View ${displayTitle}`);
  button.onclick = () => openArtwork(featured.id);
}

function renderGallery() {
  const artworks = filteredArtworks();
  count.textContent = String(artworks.length).padStart(2, "0");
  savedCount.textContent = state.saved.length ? String(state.saved.length) : "";
  empty.hidden = artworks.length > 0;
  gallery.hidden = artworks.length === 0;
  gallery.innerHTML = artworks.map((artwork, index) => {
    const isSaved = state.saved.includes(artwork.id);
    return `<article class="art-card ${escapeHtml(artwork.shape)}" style="--delay:${index * 45}ms">
      <button class="art-open" type="button" data-open-art="${escapeHtml(artwork.id)}" aria-label="View ${escapeHtml(artwork.title)}">
        <img src="${escapeHtml(artwork.image)}" alt="${escapeHtml(artworkTitle(artwork))} artwork" loading="lazy" />
      </button>
      <button class="save-button ${isSaved ? "saved" : ""}" type="button" data-save-art="${escapeHtml(artwork.id)}" aria-label="${isSaved ? "Remove" : "Save"} ${escapeHtml(artworkTitle(artwork))} ${isSaved ? "from saved" : "for later"}" aria-pressed="${isSaved}">
        ${bookmarkIcon(isSaved)}
      </button>
      <div class="art-meta"><span>${escapeHtml(artworkTitle(artwork))}</span><span>${escapeHtml(artworkMeta(artwork.category, artwork.year))}</span></div>
    </article>`;
  }).join("");

  gallery.querySelectorAll("[data-open-art]").forEach((button) => {
    button.addEventListener("click", () => openArtwork(button.dataset.openArt));
  });
  gallery.querySelectorAll("[data-save-art]").forEach((button) => {
    button.addEventListener("click", () => toggleSaved(button.dataset.saveArt));
  });
}

function setFilter(filter) {
  state.filter = filter;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const active = button.dataset.filter === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderGallery();
}

function toggleSaved(id) {
  state.saved = state.saved.includes(id) ? state.saved.filter((savedId) => savedId !== id) : [...state.saved, id];
  writeSaved();
  renderGallery();
  if (state.selected?.id === id) renderLightboxSave();
}

function openArtwork(id) {
  const artwork = state.artworks.find((item) => item.id === id);
  if (!artwork) return;
  state.selected = artwork;
  document.querySelector("[data-lightbox-image]").src = artwork.image;
  document.querySelector("[data-lightbox-image]").alt = artworkTitle(artwork);
  document.querySelector("[data-lightbox-title]").textContent = artworkTitle(artwork);
  document.querySelector("[data-lightbox-detail]").textContent = artworkMeta(artwork.medium, artwork.year);
  document.querySelector("[data-lightbox-description]").textContent = artwork.description || "";
  renderLightboxSave();
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  document.querySelector("[data-close-lightbox]").focus();
}

function renderLightboxSave() {
  if (!state.selected) return;
  const button = document.querySelector("[data-lightbox-save]");
  const isSaved = state.saved.includes(state.selected.id);
  button.classList.toggle("saved", isSaved);
  button.innerHTML = `${bookmarkIcon(isSaved)}${isSaved ? "Saved" : "Save for later"}`;
  button.setAttribute("aria-pressed", String(isSaved));
}

function closeLightbox() {
  lightbox.hidden = true;
  state.selected = null;
  document.body.style.overflow = "";
}

function openAbout() {
  about.hidden = false;
  document.body.style.overflow = "hidden";
  document.querySelector("[data-close-about]").focus();
}

function closeAbout() {
  about.hidden = true;
  document.body.style.overflow = "";
}

async function loadLiveArchive() {
  try {
    const response = await fetch(FEED_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data.artworks)) {
      state.artworks = data.artworks;
      renderFeatured();
      renderGallery();
    }
  } catch {
    // Keep the archive empty rather than showing outdated sample artwork.
  }
}

document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => setFilter(button.dataset.filter)));
document.querySelector("[data-show-all]").addEventListener("click", () => setFilter("All"));
document.querySelector("[data-open-about]").addEventListener("click", openAbout);
document.querySelector("[data-close-about]").addEventListener("click", closeAbout);
document.querySelector("[data-close-lightbox]").addEventListener("click", closeLightbox);
document.querySelector("[data-lightbox-save]").addEventListener("click", () => state.selected && toggleSaved(state.selected.id));
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!lightbox.hidden) closeLightbox();
    if (!about.hidden) closeAbout();
  }
});

initializeOwnerStudio();
renderFeatured();
renderGallery();
loadLiveArchive();
