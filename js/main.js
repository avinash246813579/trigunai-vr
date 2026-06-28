/* ---------------------------------------------------------------------------
   main.js
   ---------------------------------------------------------------------------
   Orchestrates the experience:
     1. Sets up the Three.js scene, camera, and WebXR-enabled renderer.
     2. Builds the video sphere (see videoSphere.js).
     3. Wires the start overlay, the "Enter VR" button, and desktop mouse-look.
     4. Runs the render loop.
--------------------------------------------------------------------------- */

import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";

import { config } from "./config.js";
import { createVideoElement, createVideoSphere } from "./videoSphere.js";
import { DesktopControls } from "./desktopControls.js";

// --- DOM references --------------------------------------------------------
const overlay = document.getElementById("overlay");
const overlayStatus = document.getElementById("overlay-status");
const startBtn = document.getElementById("start-btn");
const vrButtonContainer = document.getElementById("vr-button-container");
const toastEl = document.getElementById("toast");

// --- Scene graph -----------------------------------------------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  config.desktop.fov,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Sit the camera at the center of the sphere.
camera.position.set(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // turn on WebXR support
document.body.appendChild(renderer.domElement);

// --- Video + sphere --------------------------------------------------------
const video = createVideoElement(config);
const videoSphere = createVideoSphere(video, config);
scene.add(videoSphere);

// --- Desktop preview controls ---------------------------------------------
const desktopControls = new DesktopControls(camera, renderer.domElement, config);

// --- "Enter VR" button -----------------------------------------------------
// VRButton handles feature detection and session start/stop for us. It is
// disabled until WebXR reports immersive-vr support (e.g. on a Quest).
const vrButton = VRButton.createButton(renderer);
vrButtonContainer.appendChild(vrButton);

// --- Start flow ------------------------------------------------------------
startBtn.addEventListener("click", startExperience);

function startExperience() {
  startBtn.disabled = true;
  overlayStatus.textContent = "Loading video…";

  // Kick off playback. play() returns a promise that rejects if the browser
  // blocks it; we surface that to the user instead of failing silently.
  video
    .play()
    .then(() => {
      hideOverlay();
      showToast("Drag to look around. Press “Enter VR” on a headset.");
    })
    .catch((err) => {
      console.error("Video playback failed:", err);
      overlayStatus.textContent =
        "Could not start playback. Check the video URL / network and retry.";
      startBtn.disabled = false;
    });
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

// --- Toast helper ----------------------------------------------------------
let toastTimer = null;
function showToast(message, duration = 4000) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), duration);
}

// --- Media error surfacing -------------------------------------------------
video.addEventListener("error", () => {
  const message =
    "Video failed to load. Verify the URL in js/config.js is reachable and CORS-enabled.";
  overlayStatus.textContent = message;
  startBtn.disabled = false;
  showToast(message, 6000);
});

// --- Resize handling -------------------------------------------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop -----------------------------------------------------------
// renderer.setAnimationLoop is XR-aware: it uses the headset's refresh rate in
// VR and requestAnimationFrame otherwise.
renderer.setAnimationLoop(() => {
  // Only run mouse-look when NOT in an immersive session; in VR the headset
  // pose drives the camera.
  if (!renderer.xr.isPresenting) {
    desktopControls.update();
  }
  renderer.render(scene, camera);
});
