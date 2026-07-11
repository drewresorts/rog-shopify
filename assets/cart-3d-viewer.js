(function () {
  var activeViewers = [];

  function fitCameraToObject(camera, object) {
    var box = new THREE.Box3().setFromObject(object);
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z) || 1;

    object.position.sub(center);

    camera.position.set(0, maxDim * 0.35, maxDim * 1.7);
    camera.lookAt(0, 0, 0);
    camera.near = maxDim / 100;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
  }

  function createViewer(container) {
    if (typeof THREE === 'undefined' || container.dataset.modelInitialized) {
      return null;
    }

    container.dataset.modelInitialized = 'true';

    var width = container.clientWidth || 96;
    var height = container.clientHeight || 96;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    var key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 3, 4);
    scene.add(key);

    var rim = new THREE.DirectionalLight(0x2f6bff, 0.5);
    rim.position.set(-3, -1, -2);
    scene.add(rim);

    var material = new THREE.MeshStandardMaterial({
      color: 0xd7dadf,
      metalness: 0.15,
      roughness: 0.45
    });

    var mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), material);
    scene.add(mesh);
    fitCameraToObject(camera, mesh);

    var state = {
      raf: null,
      destroyed: false
    };

    function animate() {
      if (state.destroyed) {
        return;
      }
      // Slow, ambient rotation — a preview spin, not an interactive one.
      mesh.rotation.y += 0.0035;
      mesh.rotation.x = Math.sin(Date.now() * 0.0002) * 0.08;
      renderer.render(scene, camera);
      state.raf = window.requestAnimationFrame(animate);
    }

    animate();

    var modelUrl = container.dataset.modelUrl;
    if (modelUrl && window.ROGParseOBJ) {
      fetch(modelUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Model fetch failed');
          }
          return response.text();
        })
        .then(function (text) {
          if (state.destroyed || !window.ROGParseOBJ) {
            return;
          }
          var parsed = window.ROGParseOBJ(text);
          if (!parsed.positions.length) {
            return;
          }

          var geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));
          if (parsed.normals) {
            geometry.setAttribute('normal', new THREE.BufferAttribute(parsed.normals, 3));
          } else {
            geometry.computeVertexNormals();
          }
          geometry.center();

          mesh.geometry.dispose();
          mesh.geometry = geometry;
          fitCameraToObject(camera, mesh);
        })
        .catch(function () {
          // Keep the fallback shape if the model can't be fetched or parsed.
        });
    }

    function handleResize() {
      var w = container.clientWidth || 96;
      var h = container.clientHeight || 96;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    var resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }

    state.destroy = function () {
      state.destroyed = true;
      if (state.raf) {
        window.cancelAnimationFrame(state.raf);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      delete container.dataset.modelInitialized;
    };

    activeViewers.push(state);
    return state;
  }

  function initViewersWithin(root) {
    root.querySelectorAll('[data-model-viewer]').forEach(function (container) {
      createViewer(container);
    });
  }

  function destroyAllViewers() {
    activeViewers.forEach(function (viewer) {
      viewer.destroy();
    });
    activeViewers = [];
  }

  window.ROGCart3D = {
    initWithin: initViewersWithin,
    destroyAll: destroyAllViewers
  };
})();
