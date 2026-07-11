(function () {
  function whenRipplesReady(callback) {
    if (typeof window.jQuery !== 'undefined' && typeof window.jQuery.fn.ripples === 'function') {
      callback();
      return;
    }

    window.setTimeout(function () {
      whenRipplesReady(callback);
    }, 50);
  }

  function setParallaxFromPointer(target, clientX, clientY) {
    var x = (clientX / window.innerWidth) * 2 - 1;
    var y = (clientY / window.innerHeight) * 2 - 1;

    var max = 18;
    var px = Math.round(x * max);
    var py = Math.round(y * max);

    target.style.setProperty('--ripples-parallax-x', px + 'px');
    target.style.setProperty('--ripples-parallax-y', py + 'px');
  }

  function initRipplesSection(section) {
    var target = section.querySelector('[data-ripples-target]');
    var imageUrl = section.dataset.imageUrl;

    if (!target || !imageUrl || typeof window.jQuery === 'undefined' || target.dataset.ripplesInitialized) {
      return;
    }

    var $ = window.jQuery;
    var $target = $(target);

    $target.css({
      backgroundImage: 'url("' + imageUrl + '")'
    });

    try {
      $target.ripples({
        resolution: 512,
        dropRadius: 20,
        perturbance: 0.04,
        interactive: true
      });
    } catch (error) {
      return;
    }

    target.dataset.ripplesInitialized = 'true';

    if (!window.__rogRipplesGlobalParallaxBound) {
      window.__rogRipplesGlobalParallaxBound = true;
      document.addEventListener(
        'pointermove',
        function (event) {
          document.querySelectorAll('[data-ripples-target]').forEach(function (el) {
            setParallaxFromPointer(el, event.clientX, event.clientY);
          });
        },
        { passive: true }
      );
    }

    var lastX = 0;
    var lastY = 0;

    // Bound on the document (not the section or the background layer) so the
    // water keeps rippling from pointer movement anywhere on the page — the
    // fixed, full-viewport background is visible behind every section, and
    // other page elements (e.g. the floating product book) react to the
    // same disturbance via the rog:ripple-drop event dispatched below.
    document.addEventListener('pointermove', function (event) {
      var rect = target.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        return;
      }

      var distance = Math.hypot(x - lastX, y - lastY);

      if (distance > 12) {
        $target.ripples('drop', x, y, 12, 0.02);
        lastX = x;
        lastY = y;

        // Broadcast the drop in viewport coordinates so unrelated page
        // elements (e.g. the floating product book) can react to the same
        // water disturbance without coupling to the ripples plugin itself.
        document.dispatchEvent(
          new CustomEvent('rog:ripple-drop', {
            detail: { x: event.clientX, y: event.clientY }
          })
        );
      }
    });

    window.addEventListener('resize', function () {
      if ($target.data('ripples')) {
        $target.ripples('updateSize');
      }
    });
  }

  function bootRipples() {
    whenRipplesReady(function () {
      document.querySelectorAll('[data-ripples-section]').forEach(function (section) {
        initRipplesSection(section);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootRipples);
  } else {
    bootRipples();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var section = event.target.querySelector('[data-ripples-section]');
    if (section) {
      whenRipplesReady(function () {
        initRipplesSection(section);
      });
    }
  });

  document.addEventListener('shopify:section:unload', function (event) {
    var section = event.target.querySelector('[data-ripples-section]');
    if (!section || typeof window.jQuery === 'undefined') {
      return;
    }

    var target = section.querySelector('[data-ripples-target]');
    if (target && window.jQuery(target).data('ripples')) {
      window.jQuery(target).ripples('destroy');
      delete target.dataset.ripplesInitialized;
    }
  });
})();
