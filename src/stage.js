const empty = document.querySelector("#stageEmpty");
let stagePlayer = null;
let pendingSong = JSON.parse(localStorage.getItem("karaokeCurrent") || "null");
let pendingSeconds = 0;
let pendingPlaying = Boolean(pendingSong);
const stageChannel = "BroadcastChannel" in window ? new BroadcastChannel("karaoke-stage") : null;
const lastCommand = JSON.parse(localStorage.getItem("karaokePlayerCommand") || "null");
if ((lastCommand?.type === "sync" || lastCommand?.type === "load") && lastCommand.song) {
  pendingSong = lastCommand.song;
  pendingSeconds = lastCommand.seconds || 0;
  pendingPlaying = lastCommand.playing !== false;
}

function setEmpty(song) {
  document.title = song ? song.title : "Màn hát karaoke";
  empty.hidden = Boolean(song);
}

function loadSong(song, seconds = 0, playing = true) {
  pendingSong = song;
  pendingSeconds = seconds;
  pendingPlaying = playing;
  setEmpty(song);
  if (!song) {
    if (stagePlayer?.stopVideo) stagePlayer.stopVideo();
    return;
  }
  if (!stagePlayer?.loadVideoById) return;
  stagePlayer.loadVideoById({ videoId: song.id, startSeconds: seconds || 0 });
  if (!playing) {
    window.setTimeout(() => stagePlayer.pauseVideo(), 250);
  }
}

function runCommand(command) {
  if (!command) return;
  if (command.type === "load" || command.type === "sync") loadSong(command.song, command.seconds || 0, command.playing !== false);
  if (!stagePlayer) return;
  if (command.type === "play" && stagePlayer.playVideo) stagePlayer.playVideo();
  if (command.type === "pause" && stagePlayer.pauseVideo) stagePlayer.pauseVideo();
  if (command.type === "seek" && stagePlayer.seekTo) stagePlayer.seekTo(command.seconds, true);
}

window.onYouTubeIframeAPIReady = () => {
  stagePlayer = new YT.Player("stagePlayer", {
    height: "100%",
    width: "100%",
    videoId: pendingSong?.id || "",
    playerVars: { autoplay: pendingSong ? 1 : 0, controls: 1 },
    events: {
      onReady: () => {
        if (pendingSong) loadSong(pendingSong, pendingSeconds, pendingPlaying);
      },
    },
  });
};

window.addEventListener("storage", (event) => {
  if (event.key === "karaokeCurrent") loadSong(JSON.parse(event.newValue || "null"));
  if (event.key === "karaokePlayerCommand") runCommand(JSON.parse(event.newValue || "null"));
});
stageChannel?.addEventListener("message", (event) => runCommand(event.data));

function notifyClosed() {
  const message = { type: "stageClosed", at: Date.now() };
  localStorage.setItem("karaokePlayerCommand", JSON.stringify(message));
  stageChannel?.postMessage(message);
}

window.addEventListener("pagehide", notifyClosed);
window.addEventListener("beforeunload", notifyClosed);

setEmpty(pendingSong);
const script = document.createElement("script");
script.src = "https://www.youtube.com/iframe_api";
document.head.append(script);
