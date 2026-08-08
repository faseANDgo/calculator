let hlsInstance = null;
let currentChannelId = null;
let activeDownloadController = null;

/* ---------- Tabs ---------- */
function initTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("view-" + btn.dataset.tab).classList.add("active");
            document.getElementById("searchInput").value = "";
            applySearch("");
            if (btn.dataset.tab === "favorites") renderFavorites();
        });
    });
}

/* ---------- Favorites (localStorage) ---------- */
function getFavorites() {
    return JSON.parse(localStorage.getItem("streambox_favorites") || "[]");
}

function isFavorite(id) {
    return getFavorites().includes(id);
}

function toggleFavorite(id) {
    let favs = getFavorites();
    if (favs.includes(id)) {
        favs = favs.filter((f) => f !== id);
    } else {
        favs.push(id);
    }
    localStorage.setItem("streambox_favorites", JSON.stringify(favs));
}

function renderFavorites() {
    const favs = getFavorites();
    const items = [...MOVIES, ...SERIES].filter((item) => favs.includes(item.id));
    const grid = document.getElementById("favoritesGrid");
    grid.innerHTML = "";
    document.getElementById("favoritesEmpty").style.display = items.length ? "none" : "block";
    items.forEach((item) => {
        grid.appendChild(buildCard(item, item.seasons ? "series" : "movie"));
    });
}

/* ---------- Live TV ---------- */
function renderChannels() {
    const list = document.getElementById("channelList");
    list.innerHTML = "";
    CHANNELS.forEach((ch) => {
        const el = document.createElement("div");
        el.className = "channel-item" + (ch.id === currentChannelId ? " active" : "");
        el.dataset.id = ch.id;
        el.innerHTML = `
            <div class="channel-logo" style="background:${ch.color}">${ch.name.charAt(0)}</div>
            <div class="channel-meta">
                <strong>${ch.name}</strong>
                <span>${ch.category}</span>
            </div>
        `;
        el.addEventListener("click", () => playChannel(ch.id));
        list.appendChild(el);
    });
}

function playChannel(id) {
    const channel = CHANNELS.find((c) => c.id === id);
    if (!channel) return;
    currentChannelId = id;
    renderChannels();

    document.getElementById("liveChannelName").innerText = channel.name;
    document.getElementById("liveNowPlaying").innerText = channel.nowPlaying;

    const video = document.getElementById("livePlayer");

    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }

    if (window.Hls && Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(channel.streamUrl);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
        });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = channel.streamUrl;
        video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
    } else {
        document.getElementById("liveNowPlaying").innerText =
            "Twoja przeglądarka nie obsługuje odtwarzania strumieni HLS.";
    }
}

/* ---------- Cards (movies / series) ---------- */
function buildCard(item, type) {
    const card = document.createElement("div");
    card.className = "card";
    const fav = isFavorite(item.id);
    card.innerHTML = `
        <button class="fav-btn ${fav ? "active" : ""}" data-id="${item.id}">${fav ? "♥" : "♡"}</button>
        <img src="${item.poster}" alt="${item.title}" loading="lazy" />
        <div class="card-info">
            <h3>${item.title}</h3>
            <span>${type === "movie" ? item.year + " • " + item.genre : item.genre}</span>
        </div>
    `;
    card.querySelector(".fav-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(item.id);
        const btn = e.currentTarget;
        btn.classList.toggle("active");
        btn.textContent = btn.classList.contains("active") ? "♥" : "♡";
    });
    card.addEventListener("click", () => {
        if (type === "movie") openMovieModal(item);
        else openSeriesModal(item);
    });
    return card;
}

function renderMovies(filter = "") {
    const grid = document.getElementById("moviesGrid");
    grid.innerHTML = "";
    MOVIES.filter((m) => m.title.toLowerCase().includes(filter.toLowerCase())).forEach((m) => {
        grid.appendChild(buildCard(m, "movie"));
    });
}

function renderSeries(filter = "") {
    const grid = document.getElementById("seriesGrid");
    grid.innerHTML = "";
    SERIES.filter((s) => s.title.toLowerCase().includes(filter.toLowerCase())).forEach((s) => {
        grid.appendChild(buildCard(s, "series"));
    });
}

/* ---------- Search ---------- */
function applySearch(term) {
    renderMovies(term);
    renderSeries(term);
}

function initSearch() {
    document.getElementById("searchInput").addEventListener("input", (e) => {
        applySearch(e.target.value);
    });
}

/* ---------- Modal: Movie ---------- */
function openMovieModal(movie) {
    const body = document.getElementById("modalBody");
    body.innerHTML = `
        <video controls playsinline src="${movie.videoUrl}"></video>
        <h2>${movie.title}</h2>
        <div class="meta">${movie.year} • ${movie.genre} • ${movie.duration}</div>
        <p class="description">${movie.description}</p>
        <div class="modal-actions">
            <button class="btn btn-secondary" id="downloadBtn">⬇ Pobierz film</button>
        </div>
        <div class="progress-wrap" id="progressWrap">
            <div class="progress-bar"><div class="progress-bar-fill" id="progressFill"></div></div>
            <div class="progress-label" id="progressLabel">0%</div>
        </div>
    `;
    document.getElementById("downloadBtn").addEventListener("click", () =>
        downloadVideo(movie.videoUrl, movie.title + ".mp4")
    );
    openModal();
}

/* ---------- Modal: Series ---------- */
function openSeriesModal(series) {
    const body = document.getElementById("modalBody");
    const seasonOptions = series.seasons
        .map((s) => `<option value="${s.season}">Sezon ${s.season}</option>`)
        .join("");

    body.innerHTML = `
        <img src="${series.poster}" alt="${series.title}" style="width:120px;border-radius:8px;float:left;margin-right:16px" />
        <h2>${series.title}</h2>
        <div class="meta">${series.genre}</div>
        <p class="description">${series.description}</p>
        <div style="clear:both"></div>
        <select class="season-select" id="seasonSelect">${seasonOptions}</select>
        <div id="episodeList"></div>
    `;

    const renderEpisodes = (seasonNum) => {
        const season = series.seasons.find((s) => s.season === Number(seasonNum));
        const list = document.getElementById("episodeList");
        list.innerHTML = "";
        season.episodes.forEach((ep) => {
            const row = document.createElement("div");
            row.className = "episode-row";
            row.innerHTML = `<span>${ep.title}</span><span class="ep-duration">${ep.duration}</span>`;
            row.addEventListener("click", () => openEpisodeModal(series, ep));
            list.appendChild(row);
        });
    };

    document.getElementById("seasonSelect").addEventListener("change", (e) =>
        renderEpisodes(e.target.value)
    );
    renderEpisodes(series.seasons[0].season);
    openModal();
}

function openEpisodeModal(series, episode) {
    const body = document.getElementById("modalBody");
    body.innerHTML = `
        <video controls playsinline autoplay src="${episode.videoUrl}"></video>
        <h2>${series.title}</h2>
        <div class="meta">${episode.title} • ${episode.duration}</div>
        <div class="modal-actions">
            <button class="btn btn-secondary" id="backBtn">← Wróć do listy odcinków</button>
            <button class="btn btn-secondary" id="downloadBtn">⬇ Pobierz odcinek</button>
        </div>
        <div class="progress-wrap" id="progressWrap">
            <div class="progress-bar"><div class="progress-bar-fill" id="progressFill"></div></div>
            <div class="progress-label" id="progressLabel">0%</div>
        </div>
    `;
    document.getElementById("backBtn").addEventListener("click", () => openSeriesModal(series));
    document.getElementById("downloadBtn").addEventListener("click", () =>
        downloadVideo(episode.videoUrl, series.title + " - " + episode.title + ".mp4")
    );
}

function openModal() {
    document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
    document.getElementById("modalOverlay").classList.remove("open");
    document.getElementById("modalBody").innerHTML = "";
    if (activeDownloadController) {
        activeDownloadController.abort();
        activeDownloadController = null;
    }
}

/* ---------- Download with progress (fetch -> blob) ---------- */
async function downloadVideo(url, filename) {
    const btn = document.getElementById("downloadBtn");
    const wrap = document.getElementById("progressWrap");
    const fill = document.getElementById("progressFill");
    const label = document.getElementById("progressLabel");

    btn.disabled = true;
    wrap.classList.add("active");
    activeDownloadController = new AbortController();

    try {
        const response = await fetch(url, { signal: activeDownloadController.signal });
        const total = Number(response.headers.get("Content-Length")) || 0;
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (total) {
                const pct = Math.round((received / total) * 100);
                fill.style.width = pct + "%";
                label.innerText = pct + "% (" + formatBytes(received) + " / " + formatBytes(total) + ")";
            } else {
                label.innerText = formatBytes(received) + " pobrane...";
            }
        }

        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        label.innerText = "Pobieranie zakończone ✓";
    } catch (err) {
        if (err.name !== "AbortError") {
            label.innerText = "Błąd pobierania: " + err.message;
        }
    } finally {
        btn.disabled = false;
        activeDownloadController = null;
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initSearch();
    renderChannels();
    renderMovies();
    renderSeries();
    playChannel(CHANNELS[0].id);

    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalOverlay").addEventListener("click", (e) => {
        if (e.target.id === "modalOverlay") closeModal();
    });
});
