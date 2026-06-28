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

  video.src = config.videoUrl;
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
