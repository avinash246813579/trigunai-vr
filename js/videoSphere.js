/* ---------------------------------------------------------------------------
   videoSphere.js
   ---------------------------------------------------------------------------
   Creates the HTML <video> element and the inverted sphere that the video is
   painted onto. Mapping an equirectangular video to the *inside* of a sphere
   is what produces the 360° effect: the viewer sits at the center and looks
   outward at the surface.
--------------------------------------------------------------------------- */

import * as THREE from "three";

/**
 * Build the <video> element used as the texture source.
 * @param {object} config - the app config (see config.js)
 * @returns {HTMLVideoElement}
 */
export function createVideoElement(config) {
  const video = document.createElement("video");

  // NOTE: the source is NOT set here — see attachVideoSource(), which picks
  // between HLS (via hls.js) and a plain MP4 based on the URL.
  video.loop = config.loop;
  video.muted = config.muted;
  video.crossOrigin = "anonymous"; // allow textures from cross-origin hosts
  video.playsInline = true; // iOS: play inline instead of fullscreen
  video.preload = "auto";

  // `playsinline` attribute (lowercase) is needed by some mobile browsers in
  // addition to the property above.
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");

  return video;
}

/**
 * Attach the configured video source to the element.
 *
 * For an HLS (.m3u8) URL this wires up hls.js for adaptive-bitrate streaming
 * (the Quest Browser can't play .m3u8 natively but supports the Media Source
 * Extensions hls.js uses). For a plain .mp4 it just sets `video.src`.
 *
 * @param {HTMLVideoElement} video
 * @param {object} config
 * @param {(message: string) => void} [onError] - called with a human-readable
 *        message if the stream fails fatally.
 * @returns {{ hls: any | null }} the hls.js instance (or null for MP4/native).
 */
export function attachVideoSource(video, config, onError = () => {}) {
  const url = config.videoUrl;
  const isHls = /\.m3u8(\?.*)?$/i.test(url);

  if (!isHls) {
    video.src = url; // progressive MP4 (or any natively supported source)
    return { hls: null };
  }

  const Hls = window.Hls;

  // Prefer hls.js whenever the browser supports Media Source Extensions
  // (Quest Browser, Chrome, Edge). It lets us control buffering and adaptive
  // switching — important on the headset, where the browser's *native* HLS (if
  // any) tends to pick conservative quality and stall. Native HLS is only used
  // as a fallback for browsers without MSE (e.g. Safari/iOS).
  if (typeof Hls !== "undefined" && Hls.isSupported()) {
    const hls = new Hls({
      // Keep full 360° detail: don't cap quality to the on-screen element size.
      capLevelToPlayerSize: false,
      // Buffer a solid runway so a throughput dip can't stall playback, but
      // not so much that 4K segments exceed the browser's MSE memory quota
      // (which throws bufferFullError and pressures the Quest's limited RAM).
      // hls.js also caps by bytes (maxBufferSize, ~60 MB) — so at lower quality
      // this naturally buffers many more seconds, exactly when the network is
      // weak and a deep buffer matters most.
      maxBufferLength: 30, // target seconds buffered ahead
      maxMaxBufferLength: 120,
      backBufferLength: 30, // keep memory footprint modest on the headset
      // Don't begin from the most pessimistic bandwidth guess (which makes the
      // opening seconds look low-res); start around 5 Mbps and let ABR climb.
      abrEwmaDefaultEstimate: 5000000,
    });

    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(window.Hls.Events.ERROR, (_evt, data) => {
      if (!data.fatal) return; // hls.js auto-recovers non-fatal errors
      switch (data.type) {
        case window.Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad(); // try to recover a dropped connection
          break;
        case window.Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          hls.destroy();
          onError(
            "Adaptive stream failed to load. Check the .m3u8 URL is reachable and CORS-enabled."
          );
      }
    });

    return { hls };
  }

  // Fallback: native HLS (Safari / iOS, which can't run hls.js).
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    return { hls: null };
  }

  // No HLS support at all.
  onError(
    "This browser can't play the adaptive (HLS) stream. Try the Meta Quest Browser or Chrome/Edge."
  );
  return { hls: null };
}

/**
 * Build the inverted sphere mesh with the video as its texture.
 * @param {HTMLVideoElement} video
 * @param {object} config
 * @returns {THREE.Mesh}
 */
export function createVideoSphere(video, config) {
  const { radius, widthSegments, heightSegments } = config.sphere;

  const geometry = new THREE.SphereGeometry(
    radius,
    widthSegments,
    heightSegments
  );

  // Flip the sphere inside-out on the X axis. Without this, the texture would
  // be painted on the outside and would appear mirrored from the center.
  geometry.scale(-1, 1, 1);

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({ map: texture });

  return new THREE.Mesh(geometry, material);
}
