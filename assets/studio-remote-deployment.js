/**
 * Random Object Studio — Remote Deployment
 * Clay-like 3D sculpting with OBJ / GLTF export
 */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  const SERIAL_PREFIX = 'RO.GS.v0.26.';

  const TOOLS = ['stretch', 'expand', 'minimize', 'bloat', 'crystallize', 'color', 'texture'];
  const SHAPES = ['sphere', 'cube', 'cylinder', 'horus', 'pyramid', 'prism'];

  const TEXTURE_PRESETS = [
    { name: 'Smooth', metalness: 0.1, roughness: 0.45, wireframe: false },
    { name: 'Matte', metalness: 0.0, roughness: 0.95, wireframe: false },
    { name: 'Metallic', metalness: 0.85, roughness: 0.2, wireframe: false },
    { name: 'Wire', metalness: 0.3, roughness: 0.5, wireframe: true },
    { name: 'Crystalline', metalness: 0.6, roughness: 0.05, wireframe: false }
  ];

  function generateSerial() {
    const num = Math.floor(10000 + Math.random() * 90000);
    return SERIAL_PREFIX + num;
  }

  function createHorusGeometry() {
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const y = (t - 0.5) * 2.2;
      let x = 0.55 + Math.sin(t * Math.PI) * 0.45;
      if (t > 0.72) x *= 1 - (t - 0.72) * 2.5;
      if (t < 0.18) x *= 0.6 + t * 2;
      points.push(new THREE.Vector2(Math.max(0.12, x), y));
    }
    const geo = new THREE.LatheGeometry(points, 48);
    geo.computeVertexNormals();
    return geo;
  }

  function createBaseGeometry(shape) {
    switch (shape) {
      case 'cube':
        return new THREE.BoxGeometry(1.6, 1.6, 1.6, 28, 28, 28);
      case 'cylinder':
        return new THREE.CylinderGeometry(0.9, 0.9, 2, 48, 24);
      case 'horus':
        return createHorusGeometry();
      case 'pyramid':
        return new THREE.ConeGeometry(1.3, 2.2, 4, 32);
      case 'prism':
        return new THREE.CylinderGeometry(0.95, 0.95, 2, 6, 24);
      case 'sphere':
      default:
        return new THREE.IcosahedronGeometry(1.1, 5);
    }
  }

  function ensureVertexColors(geometry, color) {
    if (!geometry.attributes.color) {
      const count = geometry.attributes.position.count;
      const colors = new Float32Array(count * 3);
      const c = new THREE.Color(color);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    return geometry.attributes.color;
  }

  function exportOBJ(mesh, serial) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const index = geo.index;
    let out = '# Random Object Studio — Remote Deployment\n';
    out += '# Serial: ' + serial + '\n';
    out += 'o ' + serial.replace(/\./g, '_') + '\n';

    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.applyMatrix4(mesh.matrixWorld);
      out += 'v ' + v.x.toFixed(6) + ' ' + v.y.toFixed(6) + ' ' + v.z.toFixed(6) + '\n';
    }

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i) + 1;
        const b = index.getX(i + 1) + 1;
        const c = index.getX(i + 2) + 1;
        out += 'f ' + a + ' ' + b + ' ' + c + '\n';
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        out += 'f ' + (i + 1) + ' ' + (i + 2) + ' ' + (i + 3) + '\n';
      }
    }

    return out;
  }

  function exportGLTF(mesh, serial) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const index = geo.index;

    const positions = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      v.applyMatrix4(mesh.matrixWorld);
      positions.push(v.x, v.y, v.z);
      if (norm) {
        const n = new THREE.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i));
        n.transformDirection(mesh.matrixWorld);
        normals.push(n.x, n.y, n.z);
      } else {
        normals.push(0, 1, 0);
      }
    }

    if (index) {
      for (let i = 0; i < index.count; i++) {
        indices.push(index.getX(i));
      }
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i);
    }

    function packFloat32(arr) {
      const buf = new ArrayBuffer(arr.length * 4);
      new Float32Array(buf).set(arr);
      return buf;
    }

    function packUint16(arr) {
      const buf = new ArrayBuffer(arr.length * 2);
      new Uint16Array(buf).set(arr);
      return buf;
    }

    const posBuf = packFloat32(positions);
    const normBuf = packFloat32(normals);
    const idxBuf = packUint16(indices);

    function b64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }

    const posB64 = b64(posBuf);
    const normB64 = b64(normBuf);
    const idxB64 = b64(idxBuf);

    const byteOffsetNorm = posBuf.byteLength;
    const byteOffsetIdx = byteOffsetNorm + normBuf.byteLength;

    const color = mesh.material.color;
    const matColor = [color.r, color.g, color.b, 1.0];

    const gltf = {
      asset: { version: '2.0', generator: 'Random Object Studio' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name: serial }],
      meshes: [{
        name: serial,
        primitives: [{
          attributes: { POSITION: 0, NORMAL: 1 },
          indices: 2,
          material: 0
        }]
      }],
      materials: [{
        name: 'StudioMaterial',
        pbrMetallicRoughness: {
          baseColorFactor: matColor,
          metallicFactor: mesh.material.metalness || 0,
          roughnessFactor: mesh.material.roughness || 0.5
        }
      }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: pos.count, type: 'VEC3', max: [2, 2, 2], min: [-2, -2, -2] },
        { bufferView: 1, componentType: 5126, count: pos.count, type: 'VEC3' },
        { bufferView: 2, componentType: 5123, count: indices.length, type: 'SCALAR' }
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: posBuf.byteLength, target: 34962 },
        { buffer: 0, byteOffset: byteOffsetNorm, byteLength: normBuf.byteLength, target: 34962 },
        { buffer: 0, byteOffset: byteOffsetIdx, byteLength: idxBuf.byteLength, target: 34963 }
      ],
      buffers: [{
        byteLength: byteOffsetIdx + idxBuf.byteLength,
        uri: 'data:application/octet-stream;base64,' + b64(
          (function () {
            const total = byteOffsetIdx + idxBuf.byteLength;
            const merged = new Uint8Array(total);
            merged.set(new Uint8Array(posBuf), 0);
            merged.set(new Uint8Array(normBuf), byteOffsetNorm);
            merged.set(new Uint8Array(idxBuf), byteOffsetIdx);
            return merged.buffer;
          })()
        )
      }],
      extras: { serial: serial }
    };

    return JSON.stringify(gltf, null, 2);
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  class RandomObjectStudio {
    constructor(section) {
      this.section = section;
      this.serial = generateSerial();
      this.activeTool = 'bloat';
      this.activeShape = 'sphere';
      this.brushSize = 0.35;
      this.brushStrength = 0.12;
      this.paintColor = new THREE.Color('#2f6bff');
      this.textureIndex = 0;
      this.isSculpting = false;
      this.isOrbiting = false;
      this.lastPointer = new THREE.Vector2();
      this.dragDelta = new THREE.Vector3();
      this._bindElements();
      this._initScene();
      this._bindEvents();
      this._updateSerialDisplay();
      this._animate();
    }

    _bindElements() {
      this.viewport = this.section.querySelector('[data-studio-viewport]');
      this.serialEl = this.section.querySelector('[data-studio-serial]');
      this.hintEl = this.section.querySelector('[data-studio-hint]');
      this.colorInput = this.section.querySelector('[data-studio-color]');
      this.brushSizeInput = this.section.querySelector('[data-studio-brush-size]');
      this.brushStrengthInput = this.section.querySelector('[data-studio-brush-strength]');
    }

    _initScene() {
      const width = this.viewport.clientWidth;
      const height = this.viewport.clientHeight;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a0a0a);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      this.camera.position.set(0, 0.5, 4.2);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(width, height);
      this.viewport.appendChild(this.renderer.domElement);

      this.ambient = new THREE.AmbientLight(0xffffff, 0.55);
      this.keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
      this.keyLight.position.set(3, 5, 4);
      this.fillLight = new THREE.DirectionalLight(0x2f6bff, 0.35);
      this.fillLight.position.set(-4, -2, 3);
      this.scene.add(this.ambient, this.keyLight, this.fillLight);

      const grid = new THREE.GridHelper(6, 24, 0x222222, 0x161616);
      grid.position.y = -1.6;
      this.scene.add(grid);

      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.orbit = { theta: 0, phi: 0.3, radius: 4.2, target: new THREE.Vector3() };

      this._setShape('sphere');
    }

    _setShape(shape) {
      if (!SHAPES.includes(shape)) return;
      this.activeShape = shape;

      if (this.mesh) {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
      }

      const geometry = createBaseGeometry(shape);
      ensureVertexColors(geometry, this.paintColor);

      this.mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          metalness: 0.15,
          roughness: 0.45,
          vertexColors: true,
          flatShading: false
        })
      );

      this.scene.add(this.mesh);
      this._applyTexturePreset(this.textureIndex);

      this.section.querySelectorAll('[data-studio-shape]').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.studioShape === shape);
      });
    }

    _applyTexturePreset(index) {
      this.textureIndex = index % TEXTURE_PRESETS.length;
      const preset = TEXTURE_PRESETS[this.textureIndex];
      if (!this.mesh) return;

      this.mesh.material.metalness = preset.metalness;
      this.mesh.material.roughness = preset.roughness;
      this.mesh.material.wireframe = preset.wireframe;
      this.mesh.material.needsUpdate = true;

      const label = this.section.querySelector('[data-studio-texture-label]');
      if (label) label.textContent = preset.name;
    }

    _updateSerialDisplay() {
      if (this.serialEl) this.serialEl.textContent = this.serial;
    }

    _pointerToNdc(event) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      this.pointer.x = x * 2 - 1;
      this.pointer.y = -(y * 2 - 1);
    }

    _getIntersection() {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObject(this.mesh);
      return hits.length > 0 ? hits[0] : null;
    }

    _sculpt(hit, deltaX, deltaY) {
      const geometry = this.mesh.geometry;
      const positions = geometry.attributes.position;
      const colors = geometry.attributes.color;
      const hitLocal = this.mesh.worldToLocal(hit.point.clone());
      const brushRadius = this.brushSize;
      const strength = this.brushStrength;

      const camRight = new THREE.Vector3();
      const camUp = new THREE.Vector3();
      camRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
      camUp.setFromMatrixColumn(this.camera.matrixWorld, 1);
      const drag = camRight.multiplyScalar(deltaX * 0.008).add(camUp.multiplyScalar(-deltaY * 0.008));

      const center = new THREE.Vector3();

      for (let i = 0; i < positions.count; i++) {
        const vx = positions.getX(i);
        const vy = positions.getY(i);
        const vz = positions.getZ(i);
        const vertex = new THREE.Vector3(vx, vy, vz);
        const dist = vertex.distanceTo(hitLocal);

        if (dist > brushRadius) continue;

        const falloff = 1 - dist / brushRadius;
        const influence = falloff * falloff * strength;

        switch (this.activeTool) {
          case 'stretch': {
            vertex.add(drag.clone().multiplyScalar(influence * 3));
            break;
          }
          case 'expand': {
            const dir = vertex.clone().sub(center).normalize();
            vertex.add(dir.multiplyScalar(influence * 0.8));
            break;
          }
          case 'minimize': {
            const dir = center.clone().sub(vertex).normalize();
            vertex.add(dir.multiplyScalar(influence * 0.8));
            break;
          }
          case 'bloat': {
            const normal = vertex.clone().normalize();
            if (normal.lengthSq() < 0.001) normal.copy(hit.face.normal);
            vertex.add(normal.multiplyScalar(influence * 0.6));
            break;
          }
          case 'crystallize': {
            const normal = vertex.clone().normalize();
            const quantized = Math.round(influence * 20) / 20;
            vertex.add(normal.multiplyScalar(quantized * 0.5));
            const snap = 0.15;
            vertex.x = Math.round(vertex.x / snap) * snap;
            vertex.y = Math.round(vertex.y / snap) * snap;
            vertex.z = Math.round(vertex.z / snap) * snap;
            break;
          }
          case 'color': {
            if (colors) {
              colors.setXYZ(i,
                THREE.MathUtils.lerp(colors.getX(i), this.paintColor.r, influence),
                THREE.MathUtils.lerp(colors.getY(i), this.paintColor.g, influence),
                THREE.MathUtils.lerp(colors.getZ(i), this.paintColor.b, influence)
              );
            }
            break;
          }
          case 'texture': {
            break;
          }
        }

        if (this.activeTool !== 'color') {
          positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
      }

      positions.needsUpdate = true;
      if (colors) colors.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    _updateCamera() {
      const { theta, phi, radius, target } = this.orbit;
      this.camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta);
      this.camera.position.y = target.y + radius * Math.cos(phi);
      this.camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta);
      this.camera.lookAt(target);
    }

    _onPointerDown(event) {
      if (event.button !== 0) return;
      this._pointerToNdc(event);
      this.lastPointer.set(event.clientX, event.clientY);

      const hit = this._getIntersection();
      if (hit && this.activeTool !== 'texture') {
        this.isSculpting = true;
        this.renderer.domElement.setPointerCapture(event.pointerId);
        if (this.hintEl) this.hintEl.textContent = 'Molding…';
      } else if (!hit) {
        this.isOrbiting = true;
        this.renderer.domElement.setPointerCapture(event.pointerId);
      }
    }

    _onPointerMove(event) {
      this._pointerToNdc(event);
      const deltaX = event.clientX - this.lastPointer.x;
      const deltaY = event.clientY - this.lastPointer.y;
      this.lastPointer.set(event.clientX, event.clientY);

      if (this.isSculpting) {
        const hit = this._getIntersection();
        if (hit) this._sculpt(hit, deltaX, deltaY);
      } else if (this.isOrbiting) {
        this.orbit.theta -= deltaX * 0.008;
        this.orbit.phi = Math.max(0.15, Math.min(Math.PI - 0.15, this.orbit.phi + deltaY * 0.008));
        this._updateCamera();
      }
    }

    _onPointerUp(event) {
      this.isSculpting = false;
      this.isOrbiting = false;
      if (this.hintEl) this.hintEl.textContent = 'Click & drag on the object to mold. Drag empty space to orbit.';
      try { this.renderer.domElement.releasePointerCapture(event.pointerId); } catch (e) { /* noop */ }
    }

    _onWheel(event) {
      event.preventDefault();
      this.orbit.radius = Math.max(2, Math.min(8, this.orbit.radius + event.deltaY * 0.005));
      this._updateCamera();
    }

    _bindEvents() {
      const canvas = this.renderer.domElement;
      canvas.addEventListener('pointerdown', this._onPointerDown.bind(this));
      canvas.addEventListener('pointermove', this._onPointerMove.bind(this));
      canvas.addEventListener('pointerup', this._onPointerUp.bind(this));
      canvas.addEventListener('pointercancel', this._onPointerUp.bind(this));
      canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

      this.section.querySelectorAll('[data-studio-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.activeTool = btn.dataset.studioTool;
          this.section.querySelectorAll('[data-studio-tool]').forEach((b) => {
            b.classList.toggle('is-active', b === btn);
          });
          const colorPanel = this.section.querySelector('[data-studio-color-panel]');
          if (colorPanel) {
            colorPanel.hidden = this.activeTool !== 'color';
          }
        });
      });

      this.section.querySelectorAll('[data-studio-shape]').forEach((btn) => {
        btn.addEventListener('click', () => this._setShape(btn.dataset.studioShape));
      });

      if (this.colorInput) {
        this.colorInput.addEventListener('input', () => {
          this.paintColor.set(this.colorInput.value);
        });
      }

      if (this.brushSizeInput) {
        this.brushSizeInput.addEventListener('input', () => {
          this.brushSize = parseFloat(this.brushSizeInput.value);
        });
      }

      if (this.brushStrengthInput) {
        this.brushStrengthInput.addEventListener('input', () => {
          this.brushStrength = parseFloat(this.brushStrengthInput.value);
        });
      }

      const textureBtn = this.section.querySelector('[data-studio-texture-cycle]');
      if (textureBtn) {
        textureBtn.addEventListener('click', () => {
          this.activeTool = 'texture';
          this.section.querySelectorAll('[data-studio-tool]').forEach((b) => b.classList.remove('is-active'));
          this._applyTexturePreset(this.textureIndex + 1);
        });
      }

      const downloadObj = this.section.querySelector('[data-studio-download-obj]');
      if (downloadObj) {
        downloadObj.addEventListener('click', () => {
          const obj = exportOBJ(this.mesh, this.serial);
          downloadFile(obj, this.serial.replace(/\./g, '_') + '.obj', 'text/plain');
        });
      }

      const downloadGltf = this.section.querySelector('[data-studio-download-gltf]');
      if (downloadGltf) {
        downloadGltf.addEventListener('click', () => {
          const gltf = exportGLTF(this.mesh, this.serial);
          downloadFile(gltf, this.serial.replace(/\./g, '_') + '.gltf', 'model/gltf+json');
        });
      }

      const resetBtn = this.section.querySelector('[data-studio-reset]');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.serial = generateSerial();
          this._updateSerialDisplay();
          this._setShape(this.activeShape);
        });
      }

      const newSerialBtn = this.section.querySelector('[data-studio-new-serial]');
      if (newSerialBtn) {
        newSerialBtn.addEventListener('click', () => {
          this.serial = generateSerial();
          this._updateSerialDisplay();
        });
      }

      this._resizeObserver = new ResizeObserver(() => {
        const w = this.viewport.clientWidth;
        const h = this.viewport.clientHeight;
        if (w === 0 || h === 0) return;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      });
      this._resizeObserver.observe(this.viewport);

      this._updateCamera();
    }

    _animate() {
      this._raf = requestAnimationFrame(() => this._animate());
      this.renderer.render(this.scene, this.camera);
    }

    destroy() {
      cancelAnimationFrame(this._raf);
      if (this._resizeObserver) this._resizeObserver.disconnect();
      if (this.mesh) {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
      }
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  function initStudio(section) {
    if (section._studioInstance) {
      section._studioInstance.destroy();
    }
    section._studioInstance = new RandomObjectStudio(section);
  }

  function whenThreeReady(callback) {
    if (typeof THREE !== 'undefined') {
      callback();
      return;
    }
    window.setTimeout(() => whenThreeReady(callback), 50);
  }

  function bootStudios() {
    whenThreeReady(() => {
      document.querySelectorAll('[data-studio-section]').forEach(initStudio);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootStudios);
  } else {
    bootStudios();
  }

  document.addEventListener('shopify:section:load', (event) => {
    const section = event.target.querySelector('[data-studio-section]');
    if (section) whenThreeReady(() => initStudio(section));
  });

  document.addEventListener('shopify:section:unload', (event) => {
    const section = event.target.querySelector('[data-studio-section]');
    if (section && section._studioInstance) {
      section._studioInstance.destroy();
      section._studioInstance = null;
    }
  });
})();
