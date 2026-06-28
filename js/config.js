/* ---------------------------------------------------------------------------
   Configuration
   ---------------------------------------------------------------------------
   This is the ONLY file the content team needs to touch to swap the video.
   Change `videoUrl` to point at any 360° equirectangular MP4.

   Requirements for the video:
   - Format:      H.264 MP4 (best Quest Browser compatibility)
   - Projection:  Equirectangular, monoscopic (single image, 2:1 aspect ratio)
   - Hosting:     Must be served over HTTPS and allow cross-origin playback
                  (CORS) if hosted on a different domain than this page.
--------------------------------------------------------------------------- */

export const config = {
  // The 360° equirectangular MP4 to play. Replace this with your own URL.
  // Local file served alongside this project (relative to index.html). For
  // production, the web team can swap this for the hosted (HTTPS/CORS) URL.
  // Web-optimized 4096x2048 / ~40 Mbps build (see README). The original
  // 5760x2880 / 200 Mbps master is mmun-bkk-360-test-1.mp4.
  videoUrl: "mmun-bkk-360-web.mp4",

  // Loop the video when it reaches the end.
  loop: true,

  // Start muted. Browsers require muting for video to autoplay; the user can
  // unmute via their headset/system controls. Set to false to start with
  // sound (playback still begins only after the user taps "Start").
  muted: false,

  // Sphere geometry. The video is mapped onto the inside of this sphere with
  // the viewer at the center. 500 is a comfortable radius; segment counts
  // keep the surface smooth without taxing the headset GPU.
  sphere: {
    radius: 500,
    widthSegments: 60,
    heightSegments: 40,
  },

  // Desktop preview camera controls (ignored while in immersive VR).
  desktop: {
    // Initial field of view in degrees.
    fov: 70,
    // Mouse-look sensitivity (higher = faster turning).
    lookSpeed: 0.1,
  },
};
