(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function initFloatingItem(el, index) {
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      return;
    }

    // Small, heavily damped drift nudged by real ripple disturbances
    // elsewhere on the page, plus a gentle idle bob so each card always
    // reads as floating — never far or fast enough to make it hard to
    // read or click through to the product.
    var x = 0;
    var y = 0;
    var vx = 0;
    var vy = 0;
    var time = index * 1.7 + Math.random() * 2;
    var hovering = false;
    var maxOffsetX = 10;
    var maxOffsetY = 7;
    var damping = 0.985;

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
      var reach = 700;

      if (distance > reach) {
        return;
      }

      var falloff = 1 - distance / reach;
      var strength = falloff * (hovering ? 0.04 : 0.3);

      vx += (dx / distance) * strength;
      vy += (dy / distance) * strength;
    });

    function tick() {
      time += 0.005;
      vx *= damping;
      vy *= damping;
      x = clamp(x + vx, -maxOffsetX, maxOffsetX);
      y = clamp(y + vy, -maxOffsetY, maxOffsetY);

      var bobX = Math.sin(time) * 3;
      var bobY = Math.cos(time * 0.8) * 4;
      var tilt = (x + bobX) * 0.08;

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
