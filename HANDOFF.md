# Deployment Handoff — 360° VR Experience (`trigunai.com/vr`)

**For:** the team that manages `trigunai.com`
**From:** Avinash (avinash@trigunai.com)
**Goal:** publish a single 360° VR video experience at **`https://trigunai.com/vr`**.

This is a **static** site — plain HTML/CSS/JS, no build step, no server-side code,
no environment variables, no database. If you can serve a folder of files over
HTTPS, you can deploy this.

---

## 1. What you're deploying

Two pieces:

| Piece | Where it comes from | Size |
| ----- | ------------------- | ---- |
| **The app** (HTML/CSS/JS) | This GitHub repo | ~30 KB |
| **The video** (`mmun-bkk-360-web.mp4`) | GitHub **Release** asset on this repo (see [Releases](../../releases)) | ~372 MB |

The video is **not** in the git repo (it exceeds GitHub's 100 MB file limit). It
is attached to the latest GitHub Release. Download it from there.

### Final layout on the server

Serve the repo contents at the `/vr/` path, with the video sitting next to
`index.html`:

```
trigunai.com/vr/
├── index.html
├── css/style.css
├── js/ (config.js, main.js, videoSphere.js, desktopControls.js)
└── mmun-bkk-360-web.mp4        ← download from the GitHub Release, place here
```

Because the video is served from the **same origin** as the page, **no CORS
configuration is required**.

---

## 2. Deploy steps

1. **Get the code:** clone or download this repo.
   ```bash
   git clone https://github.com/avinash246813579/trigunai-vr.git
   ```
2. **Get the video:** download `mmun-bkk-360-web.mp4` from this repo's latest
   **Release** and place it in the project root (next to `index.html`).
3. **Publish under `/vr/`:** copy the folder contents to wherever `trigunai.com`
   serves static files, under the `/vr/` path. `index.html` must be the
   directory index for `/vr/`.
4. **Verify** (see §4).

That's it. To update the video later, see §5.

---

## 3. Hosting requirements (please confirm these)

| Requirement | Why it matters |
| ----------- | -------------- |
| **HTTPS** | **Mandatory.** The WebXR API (the "Enter VR" button) only works in a secure context. Over plain HTTP the page loads but VR will not start. |
| **HTTP Range requests** (`Accept-Ranges: bytes`, `206` responses) | Lets the 372 MB video stream and seek without downloading the whole file first. Virtually all production web servers / CDNs do this by default — just don't disable it. |
| **Correct MIME type** | The `.mp4` must be served as `Content-Type: video/mp4`. |
| **Trailing-slash / directory index** | Serve the app at `/vr/` (with trailing slash) so the page's **relative** asset paths (`css/…`, `js/…`, the video) resolve correctly. A bare `/vr` should redirect to `/vr/`. |
| **Same-origin video** | Keep the video on `trigunai.com` so no cross-origin/CORS headers are needed. (If you ever move it to a separate CDN/bucket, that host must then send `Access-Control-Allow-Origin: *` and support Range — see §6.) |

### Recommended caching

The video is large and immutable, so cache it hard:

```
# for mmun-bkk-360-web.mp4
Cache-Control: public, max-age=31536000, immutable

# for index.html (so app updates show up)
Cache-Control: no-cache
```

---

## 4. How to verify it works

**Desktop (quick sanity check):** open `https://trigunai.com/vr/` in Chrome or
Edge → click **Start** → you should see the 360° video and be able to
click-and-drag to look around.

**On a Meta Quest headset (the real test):**
1. Open the **Meta Quest Browser**.
2. Go to `https://trigunai.com/vr/`.
3. Tap **Start**, then tap **Enter VR**.
4. You should be inside the 360° scene, head-tracked. Press the Meta button to exit.

If **Enter VR** is greyed out, the page is not on HTTPS (or the headset can't
reach it) — re-check §3.

---

## 5. Changing the video later (no code changes)

The video source is the **only** thing content owners need to touch. Edit
**`js/config.js`**:

```js
export const config = {
  videoUrl: "mmun-bkk-360-web.mp4",   // ← change this
  // ...
};
```

- A **relative** value (like above) loads from the same `/vr/` folder.
- An **absolute** URL (`https://…`) loads from anywhere — but that host must be
  HTTPS, CORS-enabled, and support Range (see §6).

**Video spec for replacements:** H.264 MP4, **equirectangular monoscopic**
(2:1 aspect ratio), faststart enabled (`-movflags +faststart`). The current file
is 4096×2048 @ ~40 Mbps — a good balance of sharpness and smooth playback on
Quest. Re-encode reference is in [`README.md`](README.md).

---

## 6. (Only if hosting the video off-origin)

If you decide to serve the video from a separate CDN / object storage instead of
same-origin, that host must:

- Serve over **HTTPS**.
- Send **`Access-Control-Allow-Origin: *`** (or `https://trigunai.com`) — the app
  reads the video as a WebGL texture, which is a cross-origin read.
- Support **Range requests**.

Then set `videoUrl` in `config.js` to that absolute `https://…` URL.

> ⚠️ Do **not** use a Google Drive / Dropbox "share" link as the video source —
> those don't serve raw video bytes with Range/CORS and will not play.

---

## 7. Notes

- **No analytics, cookies, or tracking** are included. Add your standard site
  tags to `index.html` if needed.
- **Three.js** is loaded from the unpkg CDN via an import map in `index.html`.
  If you prefer to self-host it (no third-party CDN dependency), see the
  "self-hosting Three.js" note in [`README.md`](README.md).
- Questions about the app itself → Avinash (avinash@trigunai.com).
