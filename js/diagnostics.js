/* ---------------------------------------------------------------------------
   diagnostics.js
   ---------------------------------------------------------------------------
   Opt-in, on-screen debugging overlay. Hidden for normal visitors; shown only
   when the page is opened with `?debug=1` (or a `#debug` hash).

   This exists because you can't open devtools inside the Meta Quest Browser —
   when a deployed stream misbehaves it just looks like a frozen frame. With the
   overlay you can see, live and in-headset, exactly what hls.js and the <video>
   element are doing (current quality, buffer, state, and every error).

   Usage:  https://trigunai.com/vr/?debug=1
--------------------------------------------------------------------------- */

/**
 * @param {HTMLVideoElement} video
 * @param {any} hls - the hls.js instance, or null (MP4 / native HLS)
 * @param {object} config
 */
export function initDiagnostics(video, hls, config) {
  if (!isDebugEnabled()) return;

  const panel = document.createElement("div");
  panel.id = "debug-panel";
  panel.innerHTML = `
    <div class="dbg-title">DIAGNOSTICS <span class="dbg-hint">(?debug=1)</span></div>
    <div id="dbg-state"></div>
    <div class="dbg-log-title">events</div>
    <div id="dbg-log"></div>
  `;
  document.body.appendChild(panel);

  const stateEl = panel.querySelector("#dbg-state");
  const logEl = panel.querySelector("#dbg-log");
  const events = [];
  const Hls = window.Hls;

  function log(msg, kind = "info") {
    const t = video.currentTime ? video.currentTime.toFixed(1) + "s" : "—";
    events.unshift({ t, msg, kind });
    if (events.length > 14) events.pop();
    logEl.innerHTML = events
      .map((e) => `<div class="dbg-${e.kind}">[${e.t}] ${e.msg}</div>`)
      .join("");
  }

  // --- Live state readout (refreshed twice a second) ---------------------
  function bufferedAhead() {
    const b = video.buffered;
    for (let i = 0; i < b.length; i++) {
      if (video.currentTime >= b.start(i) && video.currentTime <= b.end(i)) {
        return (b.end(i) - video.currentTime).toFixed(1) + "s";
      }
    }
    return "0s";
  }

  function currentLevel() {
    if (!hls || !Hls || hls.currentLevel < 0) return "auto / —";
    const lv = hls.levels[hls.currentLevel];
    if (!lv) return "—";
    return `${lv.width}×${lv.height} @ ${Math.round(lv.bitrate / 1000)}kbps`;
  }

  function bandwidthEstimate() {
    if (!hls || !Hls || !hls.bandwidthEstimate) return "—";
    return Math.round(hls.bandwidthEstimate / 1000) + " kbps";
  }

  function playState() {
    if (video.error) return "ERROR";
    if (video.paused) return "paused";
    // readyState < 3 (HAVE_FUTURE_DATA) while playing means it's stalling.
    if (video.readyState < 3) return "buffering…";
    return "playing";
  }

  function render() {
    const rows = [
      ["source", config.videoUrl],
      ["hls.js", hls ? "active" : Hls ? "not used (MP4/native)" : "NOT LOADED"],
      ["state", playState()],
      ["time", `${video.currentTime.toFixed(1)}s / ${isFinite(video.duration) ? video.duration.toFixed(1) : "?"}s`],
      ["buffered ahead", bufferedAhead()],
      ["quality", currentLevel()],
      ["bandwidth est", bandwidthEstimate()],
      ["readyState", String(video.readyState)],
    ];
    stateEl.innerHTML = rows
      .map(([k, v]) => `<div><span class="dbg-k">${k}</span><span class="dbg-v">${v}</span></div>`)
      .join("");
  }
  setInterval(render, 500);
  render();

  // --- <video> element events --------------------------------------------
  ["waiting", "stalled", "playing", "canplay", "ended", "error"].forEach((ev) =>
    video.addEventListener(ev, () => {
      if (ev === "error" && video.error) {
        log(`video error: code ${video.error.code} ${video.error.message || ""}`, "err");
      } else {
        log(`video: ${ev}`, ev === "waiting" || ev === "stalled" ? "warn" : "info");
      }
    })
  );

  // --- hls.js events ------------------------------------------------------
  if (hls && Hls) {
    hls.on(Hls.Events.MANIFEST_PARSED, (_e, d) =>
      log(`manifest parsed: ${d.levels.length} levels`, "ok")
    );
    hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
      const lv = hls.levels[d.level];
      log(`switched → ${lv ? lv.height + "p" : d.level}`, "info");
    });
    hls.on(Hls.Events.ERROR, (_e, d) => {
      log(`hls ${d.fatal ? "FATAL " : ""}${d.type}: ${d.details}`, d.fatal ? "err" : "warn");
    });
    log("hls.js initialised", "ok");
  } else {
    log(`source attached: ${config.videoUrl}`, "ok");
  }
}

function isDebugEnabled() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "1" || window.location.hash === "#debug";
  } catch {
    return false;
  }
}
