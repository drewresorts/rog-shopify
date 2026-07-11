(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function initFlipping(root) {
    var pages = Array.prototype.slice.call(root.querySelectorAll('[data-flipbook-page]'));
    var prevButton = root.querySelector('[data-flip-prev]');
    var nextButton = root.querySelector('[data-flip-next]');
    var status = root.querySelector('[data-flip-status]');

    if (!pages.length) {
      return;
    }

    var current = 0;

    function render() {
      pages.forEach(function (page, index) {
        var isFlipped = index < current;
        page.classList.toggle('is-flipped', isFlipped);
        page.style.zIndex = isFlipped ? index : pages.length - index;
        page.setAttribute('aria-hidden', index === current ? 'false' : 'true');
      });

      if (prevButton) {
        prevButton.disabled = current === 0;
      }
      if (nextButton) {
        nextButton.disabled = current === pages.length - 1;
      }
      if (status) {
        status.textContent = (current + 1) + ' / ' + pages.length;
      }
    }

    function next() {
      if (current < pages.length - 1) {
        current += 1;
        render();
      }
    }

    function prev() {
      if (current > 0) {
        current -= 1;
        render();
      }
    }

    if (nextButton) {
      nextButton.addEventListener('click', next);
    }
    if (prevButton) {
      prevButton.addEventListener('click', prev);
    }

    pages.forEach(function (page) {
      var corner = page.querySelector('[data-flip-corner]');
      if (corner) {
        corner.addEventListener('click', next);
      }
    });

    root.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight') {
        next();
      } else if (event.key === 'ArrowLeft') {
        prev();
      }
    });

    render();
  }

  function initFloating(root) {
    var stage = root.querySelector('[data-flipbook-stage]');

    if (!stage) {
      return;
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      return;
    }

    // Position/velocity are kept tiny and heavily damped so the book only
    // ever drifts a short, slow distance from ripples elsewhere on the
    // page — enough to feel like it's floating on water, never so far or
    // fast that it becomes hard to find or click.
    var x = 0;
    var y = 0;
    var vx = 0;
    var vy = 0;
    var time = Math.random() * 1000;
    var hovering = false;
    var maxOffsetX = 22;
    var maxOffsetY = 12;
    var damping = 0.985;

    root.addEventListener('pointerenter', function () {
      hovering = true;
    });
    root.addEventListener('pointerleave', function () {
      hovering = false;
    });

    document.addEventListener('rog:ripple-drop', function (event) {
      var rect = stage.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = cx - event.detail.x;
      var dy = cy - event.detail.y;
      var distance = Math.hypot(dx, dy) || 1;
      var reach = 900;

      if (distance > reach) {
        return;
      }

      // Impulse fades with distance and is scaled right down; hovering the
      // book calms it further so users can flip pages without it drifting.
      var falloff = 1 - distance / reach;
      var strength = falloff * (hovering ? 0.05 : 0.4);

      vx += (dx / distance) * strength;
      vy += (dy / distance) * strength;
    });

    function tick() {
      time += 0.004;
      vx *= damping;
      vy *= damping;
      x = clamp(x + vx, -maxOffsetX, maxOffsetX);
      y = clamp(y + vy, -maxOffsetY, maxOffsetY);

      var bobX = Math.sin(time) * 3;
      var bobY = Math.cos(time * 0.75) * 2.4;
      var tilt = (x + bobX) * 0.06;

      stage.style.transform =
        'translate3d(' + (x + bobX).toFixed(2) + 'px, ' + (y + bobY).toFixed(2) + 'px, 0) rotate(' + tilt.toFixed(2) + 'deg)';

      window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  }

  function initFlipbook(root) {
    initFlipping(root);
    initFloating(root);
  }

  function boot() {
    document.querySelectorAll('[data-flipbook]').forEach(initFlipbook);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-flipbook]');
    if (root) {
      initFlipbook(root);
    }
  });
})();
