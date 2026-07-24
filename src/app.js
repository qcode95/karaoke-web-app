import { addSong, moveSongUp, prioritizeSong, removeSong, reorderSong } from "./queue.js";

const els = {
  backHome: document.querySelector("#backHome"),
  dockChannel: document.querySelector("#dockChannel"),
  dockTitle: document.querySelector("#dockTitle"),
  loadMore: document.querySelector("#loadMore"),
  nextButton: document.querySelector("#nextButton"),
  openStage: document.querySelector("#openStage"),
  playPauseButton: document.querySelector("#playPauseButton"),
  player: document.querySelector("#player"),
  playerDock: document.querySelector("#playerDock"),
  playerThumb: document.querySelector("#playerThumb"),
  prevButton: document.querySelector("#prevButton"),
  query: document.querySelector("#query"),
  queue: document.querySelector("#queue"),
  queueCount: document.querySelector("#queueCount"),
  queueToggle: document.querySelector("#queueToggle"),
  randomRecommend: document.querySelector("#randomRecommend"),
  recommendArtists: document.querySelector("#recommendArtists"),
  recommendSongs: document.querySelector("#recommendSongs"),
  results: document.querySelector("#results"),
  searchForm: document.querySelector("#searchForm"),
  status: document.querySelector("#status"),
};

const artists = ["Vũ", "Khắc Việt", "Sơn Tùng M-TP", "Đen Vâu", "Mỹ Tâm", "Noo Phước Thịnh", "Hòa Minzy", "Bích Phương"];
const recommendQueries = [
  "karaoke mới nhất Vũ Khắc Việt JayKii HuyR",
  "karaoke ballad Việt Nam mới nhất",
  "karaoke nhạc trẻ dễ hát",
  "karaoke song ca nam nữ mới nhất",
  "karaoke Vũ Bước Qua Nhau Chuyện Rằng",
  "karaoke Khắc Việt Yêu Lại Từ Đầu",
  "karaoke Đen Vâu đưa nhau đi trốn",
  "karaoke Mỹ Tâm Hòa Minzy Bích Phương",
];
let queue = JSON.parse(localStorage.getItem("karaokeQueue") || "[]");
let current = JSON.parse(localStorage.getItem("karaokeCurrent") || "null");
let history = [];
let visibleSongs = [];
let recommendationSongs = [];
let lastQuery = "";
let nextPageToken = "";
let ytPlayer = null;
let isPlaying = false;
let stageIsOpen = false;
const stageChannel = "BroadcastChannel" in window ? new BroadcastChannel("karaoke-stage") : null;
const placeholderThumb = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Crect width='56' height='56' rx='6' fill='%234a4a4a'/%3E%3Cpath d='M15 30v-4M21 34V22M27 31v-6M33 36V20M39 31v-6' stroke='%23c9c9c9' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E";
els.playerThumb.src = placeholderThumb;

queue = queue.map((song) => ({ ...song, queueId: song.queueId || crypto.randomUUID() }));

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function save() {
  localStorage.setItem("karaokeQueue", JSON.stringify(queue));
  localStorage.setItem("karaokeCurrent", JSON.stringify(current));
}

function saveStageCommand(command) {
  const message = { ...command, at: Date.now() };
  localStorage.setItem("karaokePlayerCommand", JSON.stringify(message));
  stageChannel?.postMessage(message);
}

function updatePlayButton() {
  els.playPauseButton.innerHTML = isPlaying ? `<i class="fa-solid fa-pause"></i>` : `<i class="fa-solid fa-play"></i>`;
}

function loadCurrentVideo(autoplay = true) {
  if (!current || !ytPlayer?.loadVideoById) return;
  ytPlayer.loadVideoById(current.id);
  if (!autoplay) ytPlayer.pauseVideo();
}

function playbackSnapshot() {
  return {
    song: current,
    seconds: ytPlayer?.getCurrentTime ? ytPlayer.getCurrentTime() || 0 : 0,
    playing: isPlaying,
  };
}

function initYouTubePlayer() {
  const previous = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (previous) previous();
    ytPlayer = new YT.Player("player", {
      height: "1",
      width: "1",
      videoId: current?.id || "",
      playerVars: { autoplay: current ? 1 : 0, controls: 0 },
      events: {
        onReady: () => {
          if (current) loadCurrentVideo(false);
        },
        onStateChange: (event) => {
          isPlaying = event.data === YT.PlayerState.PLAYING;
          updatePlayButton();
        },
      },
    });
  };

  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  document.head.append(script);
}

function setCurrent(song, pushHistory = true) {
  if (song && current && current.id !== song.id && pushHistory) history.push(current);
  current = song;
  if (!song) {
    els.playerDock.classList.add("is-empty");
    els.dockTitle.textContent = "Choose a song to play";
    els.dockChannel.textContent = "";
    els.playerThumb.src = placeholderThumb;
    els.playerThumb.alt = "";
    isPlaying = false;
    updatePlayButton();
    if (ytPlayer?.stopVideo) ytPlayer.stopVideo();
    save();
    return;
  }

  els.playerDock.classList.remove("is-empty");
  els.dockTitle.textContent = song.title;
  els.dockChannel.textContent = song.channel;
  els.playerThumb.src = song.thumb;
  els.playerThumb.alt = song.title;
  loadCurrentVideo();
  if (stageIsOpen && ytPlayer?.mute) ytPlayer.mute();
  saveStageCommand({ type: "load", song });
  save();
}

function playNext() {
  const [next, ...rest] = queue;
  queue = rest;
  setCurrent(next || null);
  renderQueue();
}

function playPrevious() {
  const previous = history.pop();
  if (!previous) return;
  if (current) queue = addSong(queue, current, true);
  setCurrent(previous, false);
  renderQueue();
}

function playQueuedSong(queueId) {
  const song = queue.find((item) => item.queueId === queueId);
  queue = removeSong(queue, queueId);
  setCurrent(song);
  renderQueue();
}

function togglePlayback() {
  if (!current || !ytPlayer) return;
  if (isPlaying) {
    ytPlayer.pauseVideo();
    saveStageCommand({ type: "pause" });
  } else {
    ytPlayer.playVideo();
    saveStageCommand({ type: "play" });
  }
}

function pauseCurrentSong() {
  if (ytPlayer?.pauseVideo) ytPlayer.pauseVideo();
  if (ytPlayer?.unMute) ytPlayer.unMute();
  stageIsOpen = false;
  isPlaying = false;
  updatePlayButton();
  saveStageCommand({ type: "pause" });
}

function openStageWindow() {
  const snapshot = playbackSnapshot();
  stageIsOpen = true;
  if (ytPlayer?.mute) ytPlayer.mute();
  saveStageCommand({ type: "sync", ...snapshot });
  const stage = window.open("singer.html", "karaoke-stage", "width=1280,height=720");
  if (!stage) {
    stageIsOpen = false;
    if (ytPlayer?.unMute) ytPlayer.unMute();
    return;
  }
  window.setTimeout(() => saveStageCommand({ type: "sync", ...playbackSnapshot() }), 500);
  stage?.focus();
}

function addToQueue(song, priority = false) {
  if (!song) return;
  if (!current) {
    setCurrent(song);
  } else {
    queue = addSong(queue, song, priority);
  }
  save();
  renderQueue();
}

function songFromYouTubeItem(item) {
  return {
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumb: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || "",
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function renderResults(songs) {
  els.results.innerHTML = songs.map((song) => `
    <article class="song-card">
      <img src="${song.thumb}" alt="${escapeHtml(song.title)}" loading="lazy">
      <div>
        <p class="song-title">${escapeHtml(song.title)}</p>
        <p class="song-channel">${escapeHtml(song.channel)}</p>
        <div class="actions">
          <button type="button" data-add="${song.id}">Chọn</button>
          <button class="secondary" type="button" data-priority="${song.id}">Ưu tiên</button>
        </div>
      </div>
    </article>
  `).join("");

  wireSongButtons(els.results, visibleSongs);
}

function wireSongButtons(root, songs) {
  root.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addToQueue(songs.find((song) => song.id === button.dataset.add)));
  });
  root.querySelectorAll("[data-priority]").forEach((button) => {
    button.addEventListener("click", () => addToQueue(songs.find((song) => song.id === button.dataset.priority), true));
  });
}

function renderRecommendations() {
  els.recommendSongs.innerHTML = recommendationSongs.length ? recommendationSongs.map((song) => `
    <article class="recommend-card">
      <img src="${song.thumb}" alt="${escapeHtml(song.title)}" loading="lazy">
      <p class="song-title">${escapeHtml(song.title)}</p>
      <p class="song-channel">Thể hiện: <strong>${escapeHtml(song.channel)}</strong></p>
      <div class="actions">
        <button type="button" data-add="${song.id}">Chọn</button>
        <button class="secondary" type="button" data-priority="${song.id}">Ưu tiên</button>
      </div>
    </article>
  `).join("") : `<p class="recommend-empty">Thêm YouTube API key vào env.js để tải gợi ý.</p>`;

  wireSongButtons(els.recommendSongs, recommendationSongs);
}

function renderQueue() {
  els.queueCount.textContent = queue.length;
  els.queue.innerHTML = queue.length ? queue.map((song, index) => `
    <li class="queue-item" draggable="true" data-queue-id="${song.queueId}">
      <img class="queue-thumb" src="${song.thumb}" alt="${escapeHtml(song.title)}" loading="lazy">
      <div>
        <span class="queue-index">#${index + 1}</span>
        <p class="song-title">${escapeHtml(song.title)}</p>
        <p class="song-channel">${escapeHtml(song.channel)}</p>
      </div>
      <details class="queue-menu">
        <summary aria-label="Tùy chọn bài hát">⋮</summary>
        <div>
          <button type="button" data-play="${song.queueId}">Hát ngay</button>
          <button type="button" data-top="${song.queueId}">Ưu tiên</button>
          <button type="button" data-up="${song.queueId}">Đẩy lên</button>
          <button class="danger" type="button" data-remove="${song.queueId}">Xóa</button>
        </div>
      </details>
    </li>
  `).join("") : `<li class="queue-empty">Danh sách chờ trống.</li>`;

  els.queue.querySelectorAll(".queue-item").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", item.dataset.queueId);
      item.classList.add("is-dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      clearDropIndicators();
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      clearDropIndicators();
      item.classList.add(dropAfter(event, item) ? "is-drop-after" : "is-drop-before");
    });
    item.addEventListener("dragleave", () => {
      item.classList.remove("is-drop-before", "is-drop-after");
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const after = dropAfter(event, item);
      clearDropIndicators();
      queue = reorderSong(queue, event.dataTransfer.getData("text/plain"), item.dataset.queueId, after);
      save();
      renderQueue();
    });
  });
  els.queue.querySelectorAll("[data-play]").forEach((button) => {
    button.addEventListener("click", () => playQueuedSong(button.dataset.play));
  });
  els.queue.querySelectorAll("[data-top]").forEach((button) => {
    button.addEventListener("click", () => {
      queue = prioritizeSong(queue, button.dataset.top);
      save();
      renderQueue();
    });
  });
  els.queue.querySelectorAll("[data-up]").forEach((button) => {
    button.addEventListener("click", () => {
      queue = moveSongUp(queue, button.dataset.up);
      save();
      renderQueue();
    });
  });
  els.queue.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      queue = removeSong(queue, button.dataset.remove);
      save();
      renderQueue();
    });
  });
}

function clearDropIndicators() {
  els.queue.querySelectorAll(".is-drop-before, .is-drop-after").forEach((item) => {
    item.classList.remove("is-drop-before", "is-drop-after");
  });
}

function dropAfter(event, item) {
  const rect = item.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

function renderChips(element, items) {
  element.innerHTML = items.map((item) => `
    <button class="chip secondary" type="button" data-query="${escapeHtml(item)}">${escapeHtml(item)}</button>
  `).join("");
  element.querySelectorAll("[data-query]").forEach((button) => {
    button.addEventListener("click", () => runSearch(button.dataset.query, true));
  });
}

async function searchYouTube(query, pageToken = "") {
  const apiKey = window.KARAOKE_YOUTUBE_API_KEY || localStorage.getItem("youtubeApiKey") || "";
  if (!apiKey) throw new Error("Thiếu YouTube API key trong env.js.");

  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    maxResults: "25",
    q: `${query} karaoke`,
    type: "video",
    videoEmbeddable: "true",
  });
  if (pageToken) params.set("pageToken", pageToken);
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Không gọi được YouTube API.");
  nextPageToken = data.nextPageToken || "";
  return data.items.map(songFromYouTubeItem);
}

async function loadRecommendations() {
  const searchToken = nextPageToken;
  try {
    renderChips(els.recommendArtists, shuffle(artists));
    const query = recommendQueries[Math.floor(Math.random() * recommendQueries.length)];
    recommendationSongs = await searchYouTube(query);
    recommendationSongs = recommendationSongs.slice(0, 16);
    renderRecommendations();
    els.status.textContent = `Đã random ${recommendationSongs.length} bài gợi ý.`;
  } catch (error) {
    recommendationSongs = [];
    renderRecommendations();
    els.status.textContent = error.message;
  } finally {
    nextPageToken = searchToken;
  }
}

async function runSearch(query, reset = true) {
  if (!query) return;

  save();
  document.body.classList.add("search-mode");
  els.status.textContent = "Đang tìm...";
  if (reset) {
    lastQuery = query;
    nextPageToken = "";
    visibleSongs = [];
    els.results.innerHTML = "";
  }
  try {
    const songs = await searchYouTube(query, reset ? "" : nextPageToken);
    visibleSongs = [...visibleSongs, ...songs];
    els.status.textContent = visibleSongs.length ? `Đang hiện ${visibleSongs.length} video.` : "Không có kết quả.";
    els.loadMore.hidden = !nextPageToken;
    renderResults(visibleSongs);
  } catch (error) {
    els.status.textContent = error.message;
    els.loadMore.hidden = true;
  }
}

els.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runSearch(els.query.value.trim());
});

els.backHome.addEventListener("click", () => {
  document.body.classList.remove("search-mode");
});
els.nextButton.addEventListener("click", playNext);
els.prevButton.addEventListener("click", playPrevious);
els.playPauseButton.addEventListener("click", togglePlayback);
els.loadMore.addEventListener("click", () => runSearch(lastQuery, false));
els.openStage.addEventListener("click", openStageWindow);
els.queueToggle.addEventListener("click", () => {
  document.body.classList.toggle("queue-hidden");
  els.queueToggle.setAttribute("aria-label", document.body.classList.contains("queue-hidden") ? "Hiện hàng chờ" : "Ẩn hàng chờ");
});
els.randomRecommend.addEventListener("click", loadRecommendations);
window.addEventListener("storage", (event) => {
  if (event.key !== "karaokePlayerCommand") return;
  const command = JSON.parse(event.newValue || "null");
  if (command?.type === "stageClosed") pauseCurrentSong();
});
stageChannel?.addEventListener("message", (event) => {
  if (event.data?.type === "stageClosed") pauseCurrentSong();
});

renderChips(els.recommendArtists, artists);
renderRecommendations();
setCurrent(current, false);
renderQueue();
initYouTubePlayer();
if (window.KARAOKE_YOUTUBE_API_KEY || localStorage.getItem("youtubeApiKey")) loadRecommendations();
