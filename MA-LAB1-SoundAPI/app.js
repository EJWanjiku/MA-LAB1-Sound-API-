const $ = (sel) => document.querySelector(sel);

const audio = $("#audio");
const fileInput = $("#fileInput");
const trackName = $("#trackName");

const playBtn = $("#playBtn");
const pauseBtn = $("#pauseBtn");
const muteBtn = $("#muteBtn");
const loopBtn = $("#loopBtn");

const seek = $("#seek");
const timeCurrent = $("#timeCurrent");
const timeDuration = $("#timeDuration");

const volume = $("#volume");
const volumeOut = $("#volumeOut");
const statusEl = $("#status");

let objectUrl = null;
let isSeeking = false;
let rafId = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function updateLoopUI() {
  loopBtn.textContent = `Loop: ${audio.loop ? "On" : "Off"}`;
}

function updateMuteUI() {
  muteBtn.textContent = audio.muted ? "Unmute" : "Mute";
}

function updateVolumeUI() {
  const pct = Math.round(audio.volume * 100);
  volumeOut.value = `${pct}%`;
  volumeOut.textContent = `${pct}%`;
}

function enableControls(enabled) {
  for (const el of [playBtn, pauseBtn, muteBtn, loopBtn, seek, volume]) {
    el.disabled = !enabled;
  }
}

function updateTimesOnce() {
  timeCurrent.textContent = formatTime(audio.currentTime);
  timeDuration.textContent = formatTime(audio.duration);
  if (!isSeeking && Number.isFinite(audio.duration) && audio.duration > 0) {
    const p = audio.currentTime / audio.duration;
    seek.value = String(Math.round(p * Number(seek.max)));
  }
}

function startRaf() {
  if (rafId != null) return;
  const tick = () => {
    updateTimesOnce();
    if (!audio.paused && !audio.ended) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };
  rafId = requestAnimationFrame(tick);
}

function stopRaf() {
  if (rafId == null) return;
  cancelAnimationFrame(rafId);
  rafId = null;
}

function setAudioSourceFromFile(file) {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  audio.src = objectUrl;
  audio.load();

  trackName.textContent = file.name || "Loaded file";
  setStatus("Loaded. Press Play (or Space).");

  enableControls(true);
  updateLoopUI();
  updateMuteUI();

  audio.volume = Number(volume.value);
  updateVolumeUI();

  // Reset UI
  seek.value = "0";
  timeCurrent.textContent = "0:00";
  timeDuration.textContent = "0:00";
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  setAudioSourceFromFile(file);
});

playBtn.addEventListener("click", async () => {
  try {
    await audio.play();
    setStatus("Playing…");
    startRaf();
  } catch (err) {
    setStatus("Playback blocked by the browser. Click Play again.");
  }
});

pauseBtn.addEventListener("click", () => {
  audio.pause();
  setStatus("Paused.");
  stopRaf();
  updateTimesOnce();
});

muteBtn.addEventListener("click", () => {
  audio.muted = !audio.muted;
  updateMuteUI();
  setStatus(audio.muted ? "Muted." : "Unmuted.");
});

loopBtn.addEventListener("click", () => {
  audio.loop = !audio.loop;
  updateLoopUI();
  setStatus(audio.loop ? "Loop enabled." : "Loop disabled.");
});

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
  updateVolumeUI();
});

seek.addEventListener("pointerdown", () => {
  isSeeking = true;
});

seek.addEventListener("pointerup", () => {
  isSeeking = false;
});

seek.addEventListener("input", () => {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  const p = Number(seek.value) / Number(seek.max);
  const nextTime = p * audio.duration;
  audio.currentTime = nextTime;
  updateTimesOnce();
});

audio.addEventListener("loadedmetadata", () => {
  updateTimesOnce();
});

audio.addEventListener("timeupdate", () => {
  if (audio.paused) updateTimesOnce();
});

audio.addEventListener("play", () => {
  setStatus("Playing…");
  startRaf();
});

audio.addEventListener("pause", () => {
  stopRaf();
});

audio.addEventListener("ended", () => {
  stopRaf();
  updateTimesOnce();
  setStatus(audio.loop ? "Looping…" : "Ended.");
});

// Creativity: keyboard controls (no libraries)
document.addEventListener("keydown", async (e) => {
  const tag = (e.target && e.target.tagName) || "";
  const isTyping =
    tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;
  if (isTyping) return;

  if (e.code === "Space") {
    e.preventDefault();
    if (playBtn.disabled) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        // ignore; status set by play handler if user clicks
      }
    } else {
      audio.pause();
    }
  }

  if (e.key.toLowerCase() === "l" && !loopBtn.disabled) {
    audio.loop = !audio.loop;
    updateLoopUI();
    setStatus(audio.loop ? "Loop enabled." : "Loop disabled.");
  }

  if (e.key.toLowerCase() === "m" && !muteBtn.disabled) {
    audio.muted = !audio.muted;
    updateMuteUI();
    setStatus(audio.muted ? "Muted." : "Unmuted.");
  }
});

// Initial state
enableControls(false);
updateLoopUI();
updateMuteUI();
audio.volume = Number(volume.value);
updateVolumeUI();

// Auto-load a bundled MP3 from the project folder (no uploads needed).
const BUILT_IN_TRACK_PATH = "./Wheres LuLu - Too Cool to Care.mp3";
setStatus("Loading built-in track…");
enableControls(true);
trackName.textContent = "Wheres LuLu - Too Cool to Care.mp3";
audio.src = encodeURI(BUILT_IN_TRACK_PATH);
audio.load();

audio.addEventListener(
  "error",
  () => {
    setStatus(
      "Could not load the built-in track. Make sure the MP3 is in the same folder as index.html, or choose an audio file above.",
    );
  },
  { once: true },
);

