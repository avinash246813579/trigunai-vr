# Deployment Handoff — 360° VR Experience (`trigunai.com/vr`)

**For:** the team that manages `trigunai.com`
**From:** Avinash (avinash@trigunai.com)
**Goal:** publish a single 360° VR video experience at **`https://trigunai.com/vr`**
that streams smoothly (YouTube-style) on a Meta Quest with **no stalls**.

This is a **static** site — plain HTML/CSS/JS, no build step, no server-side code.
If you can serve a folder of files over HTTPS, you can deploy this.

> **Why HLS?** A single big MP4 either stalls (network can't sustain the bitrate)
> or makes the user wait minutes for a full download. We now ship the video as an
> **HLS adaptive stream** (the same technique YouTube uses): the video is split
> into short segments at several quality levels, and the player auto-switches to
> match current bandwidth — fast start, no long load, no freezing.

---

## 1. What you're deploying

Three pieces:

| Piece | Where it comes from | Size |
| ----- | ------------------- | ---- |
| **The app** (HTML/CSS/JS) | This GitHub repo | ~40 KB |
| **The HLS stream** (`hls/` folder: `master.m3u8` + `v0–v4` playlists + `.ts` segments) | GitHub **Release** asset `hls.zip` | ~480 MB |
| **`hls.js`** player library | jsDelivr CDN (already referenced in `index.html`) | loads at runtime |

The HLS folder is **not** in the git repo (hundreds of segment files). It's
attached to the latest GitHub Release as `hls.zip`. The single-file MP4 is also
attached, as a fallback only.

### Final layout on the server

Serve the repo contents at `/vr/`, with the unzipped `hls/` folder next to
`index.html`:

```
trigunai.com/vr/
├── index.html
├── css/style.css
├── js/ (config.js, main.js, videoSphere.js, desktopControls.js, diagnostics.js)
└── hls/
    ├── master.m3u8          ← the player loads this
    ├── v0.m3u8 … v4.m3u8    ← per-quality playlists (1280×640 … 5760×2880)
    └── v0_000.ts, …         ← video segments (~4 s each)
```

Because everything is served from the **same origin** as the page, **no CORS
configuration is required**.

---

## 2. Deploy steps

1. **Get the code (latest `main`):**
   `git clone https://github.com/avinash246813579/trigunai-vr.git`
   (If you cloned earlier, `git pull` — the player was tuned for smooth streaming.)
2. **Get the stream:** download `hls.zip` from this repo's latest **Release**
   ([v3.0.0](https://github.com/avinash246813579/trigunai-vr/releases/tag/v3.0.0))
   and unzip it into the project root so you have a `hls/` folder next to
   `index.html` (replacing any older `hls/`).
3. **Publish under `/vr/`:** copy the folder contents to wherever `trigunai.com`
   serves static files, under `/vr/`. `index.html` must be the directory index.
4. **Verify** (see §4).

To change the video later, see §5.

---

## 3. Hosting requirements (please confirm these)

| Requirement | Why it matters |
| ----------- | -------------- |
| **HTTPS** | **Mandatory.** WebXR ("Enter VR") only works in a secure context. Over plain HTTP the page loads but VR won't start. |
| **Correct MIME types** | `.m3u8` → `application/vnd.apple.mpegurl`; `.ts` → `video/mp2t`. Most servers/CDNs set these automatically — confirm they aren't served as `text/plain` or `application/octet-stream`. |
| **HTTP Range requests** | Standard for segment delivery; leave it enabled (default on all CDNs). |
| **Trailing-slash / directory index** | Serve the app at `/vr/` (with trailing slash) so the page's **relative** paths (`css/…`, `js/…`, `hls/…`) resolve. A bare `/vr` should redirect to `/vr/`. |
| **Same-origin stream** | Keep `hls/` on `trigunai.com` so no CORS is needed. If you move it to a separate CDN/bucket, that host must send `Access-Control-Allow-Origin` on **the manifests *and* the segments** (see §6). |

### Recommended caching

Segments and playlists are immutable for this VOD, so cache them hard; keep
`index.html` fresh:

```
# hls/*.ts and hls/*.m3u8
Cache-Control: public, max-age=31536000, immutable

# index.html, and css/ + js/ (so app updates aren't masked by stale caches)
Cache-Control: no-cache
```

> Stale cached `css/`/`js/` is a common reason a site "works locally but behaves
> differently / doesn't update after deploy." Keep those revalidated as above
> (or version them), and hard-refresh when testing a new deploy.

---

## 4. How to verify it works

**Desktop (quick check):** open `https://trigunai.com/vr/` in Chrome/Edge → click
**Start** → the 360° video plays and you can click-drag to look around. It should
start within a second or two (low quality first, sharpening as it ramps up).

**On a Meta Quest headset (the real test):**
1. Open the **Meta Quest Browser**.
2. Go to `https://trigunai.com/vr/`.
3. Tap **Start**, then **Enter VR**. You should be inside the scene, head-tracked,
   with **no stalls** even if Wi-Fi fluctuates. Press the Meta button to exit.

If **Enter VR** is greyed out → the page isn't on HTTPS. If it stalls or won't
play → check the `.m3u8`/`.ts` MIME types (§3) first.

### On-screen debugger (`?debug=1`)

Devtools aren't available in the Quest Browser, so if the deployed stream
misbehaves, open **`https://trigunai.com/vr/?debug=1`**. A live panel (top-left)
shows the source URL, whether hls.js is active, play state, seconds buffered,
current quality, and a color-coded log of every hls.js / video error — so you can
see the exact failure (bad MIME, CORS, 404-as-HTML, etc.) on the headset itself.
It's hidden for normal visitors.

---

## 5. Changing the video later

Content owners edit only **`js/config.js`**:

```js
export const config = {
  videoUrl: "hls/master.m3u8",   // ← HLS stream (preferred)
  // videoUrl: "mmun-bkk-360-web.mp4",  // ← or a single MP4 fallback
};
```

To replace the video you re-run the HLS encode on the new master and drop the new
`hls/` folder in place. The **`README.md`** has the exact `ffmpeg` command for the
adaptive ladder. Source must be **equirectangular, monoscopic** (2:1 aspect).

The app accepts either an HLS `.m3u8` URL or a plain `.mp4` URL (it auto-detects
and uses `hls.js` only for `.m3u8`). Absolute `https://…` URLs work too, but an
off-origin host must satisfy §6.

---

## 6. (Only if hosting the stream off-origin)

If you serve `hls/` from a separate CDN / bucket instead of same-origin, that host
must, **for both manifests and segments**:

- Serve over **HTTPS**.
- Send **`Access-Control-Allow-Origin: *`** (or `https://trigunai.com`) — the app
  reads video frames as a WebGL texture, a cross-origin read.
- Use the correct MIME types (§3).

Then set `videoUrl` in `config.js` to the absolute `https://…/master.m3u8` URL.

> ⚠️ Do **not** use a Google Drive / Dropbox "share" link — those don't serve raw
> bytes with Range/CORS and will not play.

---

## 7. Notes

- **No analytics/cookies/tracking** included — add your standard site tags to
  `index.html` if needed.
- **Third-party CDNs at runtime:** `three.js` (unpkg) and `hls.js` (jsDelivr) load
  from CDNs via tags in `index.html`. To remove that dependency you can self-host
  both — see the "self-hosting" note in `README.md`.
- Questions about the app itself → Avinash (avinash@trigunai.com).
