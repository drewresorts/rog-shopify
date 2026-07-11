(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function initFloatingItem(el, index) {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      return;
    }

    // Drift nudged by real ripple disturbances elsewhere on the page, plus
    // an idle bob so each card always reads as floating. Tuned to be
    // clearly visible while still settling back down rather than wandering
    // off — hovering calms it further so it's easy to click through.
    var x = 0;
    var y = 0;
    var vx = 0;
    var vy = 0;
    var time = index * 1.7 + Math.random() * 2;
    var hovering = false;
    var maxOffsetX = 30;
    var maxOffsetY = 20;
    var damping = 0.97;

    el.addEventListener('pointerenter', function () {
      hovering = true;
    });
    el.addEventListener('pointerleave', function () {
      hovering = false;
    });

    document.addEventListener('rog:ripple-drop', function (event) {
      var rect = el.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = cx - event.detail.x;
      var dy = cy - event.detail.y;
      var distance = Math.hypot(dx, dy) || 1;
      var reach = 1100;

      if (distance > reach) {
        return;
      }

      var falloff = 1 - distance / reach;
      var strength = falloff * (hovering ? 0.15 : 1.1);

      vx += (dx / distance) * strength;
      vy += (dy / distance) * strength;
    });

    function tick() {
      time += 0.005;
      vx *= damping;
      vy *= damping;
      x = clamp(x + vx, -maxOffsetX, maxOffsetX);
      y = clamp(y + vy, -maxOffsetY, maxOffsetY);

      var bobX = Math.sin(time) * 6;
      var bobY = Math.cos(time * 0.8) * 7;
      var tilt = (x + bobX) * 0.12;

      el.style.transform =
        'translate3d(' + (x + bobX).toFixed(2) + 'px, ' + (y + bobY).toFixed(2) + 'px, 0) rotate(' + tilt.toFixed(2) + 'deg)';

      window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
  }

  function boot() {
    document.querySelectorAll('[data-floating-item]').forEach(function (el, index) {
      initFloatingItem(el, index);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (event) {
    event.target.querySelectorAll('[data-floating-item]').forEach(function (el, index) {
      initFloatingItem(el, index);
    });
  });
})();
