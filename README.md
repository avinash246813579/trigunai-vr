# 360° VR Video Player (WebXR)

A lightweight, self-contained WebXR experience that plays a single remote 360°
equirectangular MP4 inside the **Meta Quest Browser** — no native Quest app
required. The video is mapped onto the inside of an inverted sphere with the
viewer at the center. Works on desktop browsers too (with mouse-look) for
previewing.

Built with [Three.js](https://threejs.org/) loaded from a CDN. There is **no
build step** — it's plain HTML/CSS/JS.

---

## Project structure

```
.
├── index.html            # Entry point + Three.js import map
├── css/
│   └── style.css         # Overlay, button, and toast styling
├── js/
│   ├── config.js         # ⬅ EDIT THIS to change the video URL & options
│   ├── videoSphere.js    # Builds the <video> element + inverted sphere
│   ├── desktopControls.js# Mouse-look for desktop preview
│   └── main.js           # Scene setup, WebXR, render loop
└── README.md
```

## Changing the video

Open **`js/config.js`** and edit `videoUrl`. That is the only change needed:

```js
export const config = {
  videoUrl: "https://your-cdn.example.com/my-360-video.mp4",
  // ...
};
```

**Video requirements**

| Property   | Recommended value                                        |
| ---------- | -------------------------------------------------------- |
| Container  | MP4                                                      |
| Codec      | H.264 (best Quest Browser compatibility)                 |
| Projection | Equirectangular, **monoscopic** (2:1 aspect ratio)       |
| Hosting    | Served over **HTTPS**, **CORS**-enabled if cross-origin  |

Other tweakable options in `config.js`: `loop`, `muted`, sphere radius/segments,
and desktop FOV / look sensitivity.

### Video sources & encoding

The master is **`mmun-bkk-360-test-1.mp4`** (H.264, 5760×2880 equirectangular,
~78 s, ~200 Mbps / 1.8 GB) — far too heavy to stream directly. Two derived
sources are used instead (both gitignored; shipped as GitHub Release assets):

**1. HLS adaptive stream (preferred — `hls/master.m3u8`).** Streams like YouTube:
short segments at four quality levels, the player auto-switches to fit bandwidth,
so it starts fast and doesn't stall. This is what `config.js` points at by
default. Rebuild it from a master with:

```bash
mkdir -p hls
ffmpeg -y -i mmun-bkk-360-test-1.mp4 \
  -filter_complex "[0:v]split=4[a][b][c][d];\
[a]scale=1280:640[v0];[b]scale=1920:960[v1];[c]scale=2880:1440[v2];[d]scale=4096:2048[v3]" \
  -map "[v0]" -map "[v1]" -map "[v2]" -map "[v3]" -map 0:a -map 0:a -map 0:a -map 0:a \
  -c:v libx264 -preset fast -pix_fmt yuv420p -g 120 -keyint_min 120 -sc_threshold 0 \
  -force_key_frames "expr:gte(t,n_forced*4)" \
  -b:v:0 2500k -maxrate:v:0 2675k -bufsize:v:0 3750k \
  -b:v:1 5000k -maxrate:v:1 5350k -bufsize:v:1 7500k \
  -b:v:2 10000k -maxrate:v:2 10700k -bufsize:v:2 15000k \
  -b:v:3 20000k -maxrate:v:3 21400k -bufsize:v:3 30000k \
  -c:a aac -b:a 128k -ac 2 \
  -f hls -hls_time 4 -hls_playlist_type vod -hls_flags independent_segments \
  -hls_segment_filename "hls/v%v_%03d.ts" -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3" "hls/v%v.m3u8"
```

The 4 s segments are keyframe-aligned across renditions so the player can switch
quality cleanly. Adjust the bitrate ladder to taste — for 360° monoscopic video
the top rung can sit lower than you'd expect (~20 Mbps at 4K still looks sharp).

**2. Single-file MP4 fallback (`mmun-bkk-360-web.mp4`).** A simpler progressive
file, only needed if you can't host HLS. It can stall on slow networks (fixed
bitrate, no adaptation). Build it with:

```bash
ffmpeg -i mmun-bkk-360-test-1.mp4 -c:v libx264 -b:v 40M -maxrate 50M \
  -bufsize 80M -vf scale=4096:2048 -movflags +faststart -c:a aac mmun-bkk-360-web.mp4
```

`+faststart` moves the MP4 index to the front so it streams without a full
download. To use it, set `videoUrl` in `config.js` to the `.mp4` path.

---

## Running locally

WebXR and video textures require the page to be served over **HTTPS** or from
**`localhost`** — opening `index.html` directly via `file://` will not work.

Pick any static server:

```bash
# Python 3 (already on most machines)
python -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>. Click **Start** to begin playback; on
desktop, click-and-drag to look around.

### Testing on a Meta Quest

The Quest Browser needs **HTTPS** to expose the WebXR API (a plain
`http://<your-ip>:8000` will load the page but the **Enter VR** button stays
disabled). Two easy options:

1. **Tunnel** your local server with HTTPS:
   ```bash
   npx localtunnel --port 8000     # or: ngrok http 8000
   ```
   Open the generated `https://…` URL in the Quest Browser.

2. **Deploy** the folder to any static HTTPS host (see below) and open that URL.

Once loaded over HTTPS on the headset: tap **Start**, then **Enter VR**.

---

## Deployment (handoff to web team)

> **Deploying to `trigunai.com/vr`?** Follow [`HANDOFF.md`](HANDOFF.md) — it has
> the exact steps, hosting requirements, and where to get the video file. The
> notes below are the general/background version.

This is a static site — copy the entire folder to any static host:

- **Netlify / Vercel / Cloudflare Pages** — drag-and-drop or connect the repo.
- **Amazon S3 + CloudFront**, **GitHub Pages**, **Azure Static Web Apps**, etc.
- Or drop it into a subdirectory of the existing website.

Requirements for the host:

- Serve over **HTTPS** (mandatory for WebXR).
- If the video is hosted on a **different domain**, that domain must send
  permissive **CORS** headers (`Access-Control-Allow-Origin`) so the texture
  can be read. The page itself sets `crossorigin="anonymous"` on the video.

No server-side code, environment variables, or build pipeline is involved.

### Optional: self-hosting Three.js

For production you may prefer not to depend on the unpkg CDN. Download
`three.module.js` and the `examples/jsm/webxr/VRButton.js` addon, place them in
a local `vendor/` folder, and update the import map in `index.html` to point at
the local paths. Behavior is otherwise identical.

---

## Browser support

| Environment            | Result                                         |
| ---------------------- | ---------------------------------------------- |
| Meta Quest Browser     | Full 360° + immersive VR via **Enter VR**      |
| Chrome/Edge (desktop)  | 360° preview with mouse-look                   |
| Safari / Firefox       | 360° preview (no immersive VR — WebXR limited) |

The **Enter VR** button only enables itself when the browser reports
`immersive-vr` support, so it gracefully hides VR on machines that can't do it.
