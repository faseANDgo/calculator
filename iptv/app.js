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

/* ---------- Custom M3U channels (localStorage) ---------- */
function getCustomChannels() {
    return JSON.parse(localStorage.getItem("streambox_custom_channels") || "[]");
}

function saveCustomChannels(list) {
    localStorage.setItem("streambox_custom_channels", JSON.stringify(list));
}

function addCustomChannels(newOnes) {
    saveCustomChannels(getCustomChannels().concat(newOnes));
}

function removeCustomChannel(id) {
    saveCustomChannels(getCustomChannels().filter((c) => c.id !== id));
    if (currentChannelId === id) {
        const remaining = getAllChannels();
        if (remaining.length) {
            playChannel(remaining[0].id);
        } else {
            showEmptyLiveState();
        }
    }
    renderChannels();
    refreshClearButton();
}

function clearCustomChannels() {
    localStorage.removeItem("streambox_custom_channels");
}

// Kanały na żywo pochodzą wyłącznie z zaimportowanej listy M3U użytkownika —
// nic nie jest odtwarzane ani ładowane, dopóki lista nie zostanie wgrana.
function getAllChannels() {
    return getCustomChannels();
}

function randomColor() {
    const palette = ["#e63946", "#2a9d8f", "#f4a261", "#264653", "#9d4edd", "#457b9d", "#e76f51", "#06d6a0"];
    return palette[Math.floor(Math.random() * palette.length)];
}

/* ---------- M3U parsing ---------- */
function parseM3U(text) {
    const lines = text.split(/\r?\n/);
    const channels = [];
    let pending = null;

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        if (line.startsWith("#EXTINF")) {
            const nameMatch = line.match(/,(.*)$/);
            const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
            const groupMatch = line.match(/group-title="([^"]*)"/i);
            pending = {
                name: nameMatch ? nameMatch[1].trim() : "Kanał",
                logo: logoMatch ? logoMatch[1] : null,
                category: groupMatch && groupMatch[1] ? groupMatch[1] : "Import",
            };
        } else if (line.startsWith("#")) {
            // inne tagi M3U (#EXTVLCOPT, #EXTGRP itd.) - pomijamy
        } else {
            if (pending) {
                channels.push({
                    id: "imp_" + Date.now() + "_" + channels.length,
                    name: pending.name,
                    category: pending.category,
                    color: randomColor(),
                    nowPlaying: "Kanał zaimportowany z listy M3U",
                    streamUrl: line,
                    logo: pending.logo,
                });
                pending = null;
            }
        }
    });

    return channels;
}

/* ---------- Import modal ---------- */
function openImportModal() {
    const body = document.getElementById("modalBody");
    body.innerHTML = `
        <h2>Dodaj listę kanałów M3U</h2>
        <p class="description">
            Wgraj plik playlisty (.m3u / .m3u8) albo podaj bezpośredni link do niej.
            Plik musi być w standardowym formacie M3U/M3U8 (linie <code>#EXTINF</code> + adres strumienia).
        </p>

        <div class="import-option">
            <label class="btn btn-secondary" style="display:inline-block">
                📁 Wybierz plik
                <input type="file" id="m3uFileInput" accept=".m3u,.m3u8,text/plain" style="display:none" />
            </label>
        </div>

        <div class="import-option" style="margin-top:14px">
            <input type="text" id="m3uUrlInput" class="url-input" placeholder="https://przyklad.pl/lista.m3u8" />
            <button class="btn btn-secondary" id="m3uUrlLoadBtn">Pobierz z URL</button>
        </div>

        <div class="import-status" id="importStatus"></div>
        <div id="importPreview"></div>
    `;

    document.getElementById("m3uFileInput").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        handleParsedM3U(text);
    });

    document.getElementById("m3uUrlLoadBtn").addEventListener("click", async () => {
        const url = document.getElementById("m3uUrlInput").value.trim();
        if (!url) return;
        const status = document.getElementById("importStatus");
        status.innerText = "Pobieranie...";
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const text = await res.text();
            handleParsedM3U(text);
        } catch (err) {
            status.innerText =
                "Błąd pobierania (" + err.message + "). Serwer listy może blokować dostęp z przeglądarki (CORS) — " +
                "spróbuj zamiast tego pobrać plik na dysk i wgrać go przyciskiem „Wybierz plik”.";
        }
    });

    openModal();
}

function handleParsedM3U(text) {
    const status = document.getElementById("importStatus");
    const preview = document.getElementById("importPreview");
    const parsed = parseM3U(text);

    if (!parsed.length) {
        status.innerText = "Nie znaleziono żadnych kanałów. Sprawdź, czy to poprawna playlista M3U.";
        preview.innerHTML = "";
        return;
    }

    status.innerText = `Znaleziono ${parsed.length} kanałów.`;
    preview.innerHTML = `
        <div class="import-list">
            ${parsed
                .slice(0, 8)
                .map((c) => `<div class="import-list-item">${c.name}</div>`)
                .join("")}
            ${parsed.length > 8 ? `<div class="import-list-item">…i ${parsed.length - 8} więcej</div>` : ""}
        </div>
        <div class="modal-actions">
            <button class="btn btn-primary" id="confirmImportBtn">Dodaj ${parsed.length} kanałów do listy</button>
        </div>
    `;

    document.getElementById("confirmImportBtn").addEventListener("click", () => {
        const hadNoChannels = getCustomChannels().length === 0;
        addCustomChannels(parsed);
        closeModal();
        renderChannels();
        refreshClearButton();
        if (hadNoChannels && parsed.length) {
            try {
                playChannel(parsed[0].id);
            } catch (err) {
                console.error("Nie udało się uruchomić odtwarzacza:", err);
            }
        }
    });
}

/* ---------- Live TV ---------- */
function renderChannels() {
    const list = document.getElementById("channelList");
    list.innerHTML = "";
    const channels = getAllChannels();

    if (!channels.length) {
        list.innerHTML = `
            <div class="channel-empty">
                <p>Nie masz jeszcze żadnych kanałów.</p>
                <button class="btn btn-primary" id="emptyImportBtn">+ Dodaj listę M3U</button>
            </div>
        `;
        list.querySelector("#emptyImportBtn").addEventListener("click", openImportModal);
        return;
    }

    channels.forEach((ch) => {
        const el = document.createElement("div");
        el.className = "channel-item" + (ch.id === currentChannelId ? " active" : "");
        el.dataset.id = ch.id;
        const isCustom = ch.id.startsWith("imp_");
        el.innerHTML = `
            <div class="channel-logo" style="background:${ch.color}">
                ${ch.logo ? `<img src="${ch.logo}" alt="" onerror="this.style.display='none'" />` : ch.name.charAt(0)}
            </div>
            <div class="channel-meta">
                <strong>${ch.name}</strong>
                <span>${ch.category}</span>
            </div>
            ${isCustom ? `<span class="channel-remove" data-id="${ch.id}" title="Usuń kanał">✕</span>` : ""}
        `;
        el.addEventListener("click", () => playChannel(ch.id));
        if (isCustom) {
            el.querySelector(".channel-remove").addEventListener("click", (e) => {
                e.stopPropagation();
                removeCustomChannel(ch.id);
            });
        }
        list.appendChild(el);
    });
}

function refreshClearButton() {
    const btn = document.getElementById("clearImportedBtn");
    const count = getCustomChannels().length;
    btn.style.display = count ? "inline-block" : "none";
    btn.innerText = `Usuń wszystkie zaimportowane kanały (${count})`;
}

function playChannel(id) {
    const channel = getAllChannels().find((c) => c.id === id);
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

function showEmptyLiveState() {
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    currentChannelId = null;
    const video = document.getElementById("livePlayer");
    video.removeAttribute("src");
    video.load();
    document.getElementById("liveChannelName").innerText = "Brak kanałów";
    document.getElementById("liveNowPlaying").innerText =
        "Dodaj listę M3U, aby rozpocząć oglądanie — do tego czasu nic nie jest ładowane ani odtwarzane.";
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
    // Podpinamy obsługę przycisków NAJPIERW, zanim spróbujemy uruchomić
    // odtwarzacz na żywo — tak, żeby awaria startu playera (np. zablokowany
    // CDN z hls.js) nigdy nie zablokowała reszty interfejsu.
    initTabs();
    initSearch();
    renderChannels();
    renderMovies();
    renderSeries();
    refreshClearButton();

    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalOverlay").addEventListener("click", (e) => {
        if (e.target.id === "modalOverlay") closeModal();
    });
    document.getElementById("openImportBtn").addEventListener("click", openImportModal);
    document.getElementById("clearImportedBtn").addEventListener("click", () => {
        if (confirm("Usunąć wszystkie zaimportowane kanały?")) {
            clearCustomChannels();
            renderChannels();
            refreshClearButton();
            showEmptyLiveState();
        }
    });

    // Nic nie jest ładowane ani odtwarzane, dopóki użytkownik sam nie doda
    // listy M3U (przycisk "+ Dodaj listę M3U") albo listy zapisanej wcześniej
    // w localStorage nie ma jeszcze zawartości.
    const channels = getAllChannels();
    if (channels.length) {
        try {
            playChannel(channels[0].id);
        } catch (err) {
            console.error("Nie udało się uruchomić odtwarzacza na żywo:", err);
            document.getElementById("liveNowPlaying").innerText =
                "Nie udało się uruchomić odtwarzacza (sprawdź konsolę przeglądarki, F12).";
        }
    } else {
        showEmptyLiveState();
    }
});
