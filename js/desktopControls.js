/* ---------------------------------------------------------------------------
   desktopControls.js
   ---------------------------------------------------------------------------
   Mouse-look controls for previewing the experience on a desktop browser.
   Click-and-drag rotates the camera. These controls are completely bypassed
   while an immersive WebXR session is active — in VR the headset drives the
   camera pose directly.
--------------------------------------------------------------------------- */

import * as THREE from "three";

export class DesktopControls {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement - element to listen for pointer events on
   * @param {object} config
   */
  constructor(camera, domElement, config) {
    this.camera = camera;
    this.domElement = domElement;
    this.lookSpeed = config.desktop.lookSpeed;

    // Spherical look angles (radians).
    this.lon = 0; // horizontal
    this.lat = 0; // vertical
    this.isPointerDown = false;
    this.pointerStart = { x: 0, y: 0 };
    this.lonStart = 0;
    this.latStart = 0;

    // Reusable target vector so we don't allocate every frame.
    this._target = new THREE.Vector3();

    this._bindEvents();
  }

  _bindEvents() {
    const el = this.domElement;
    el.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    el.addEventListener("pointermove", (e) => this._onPointerMove(e));
    el.addEventListener("pointerup", () => this._onPointerUp());
    el.addEventListener("pointerleave", () => this._onPointerUp());
  }

  _onPointerDown(event) {
    this.isPointerDown = true;
    this.pointerStart.x = event.clientX;
    this.pointerStart.y = event.clientY;
    this.lonStart = this.lon;
    this.latStart = this.lat;
  }

  _onPointerMove(event) {
    if (!this.isPointerDown) return;
    // Drag right -> look right; drag up -> look up.
    this.lon =
      this.lonStart - (event.clientX - this.pointerStart.x) * this.lookSpeed;
    this.lat =
      this.latStart + (event.clientY - this.pointerStart.y) * this.lookSpeed;
  }

  _onPointerUp() {
    this.isPointerDown = false;
  }

  /**
   * Apply the current look angles to the camera. Call once per frame, but
   * skip while in VR (the XR system controls the camera then).
   */
  update() {
    // Clamp vertical look so you can't flip over the poles.
    this.lat = Math.max(-85, Math.min(85, this.lat));

    const phi = THREE.MathUtils.degToRad(90 - this.lat);
    const theta = THREE.MathUtils.degToRad(this.lon);

    this._target.setFromSphericalCoords(1, phi, theta);
    this.camera.lookAt(this._target);
  }
}
