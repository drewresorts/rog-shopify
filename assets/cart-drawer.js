(function () {
  if (window.__rogCartDrawerBound) {
    return;
  }
  window.__rogCartDrawerBound = true;

  var root = document.querySelector('[data-cart-drawer]');
  if (!root) {
    return;
  }

  var panel = root.querySelector('[data-cart-drawer-panel]');
  var handle = root.querySelector('[data-cart-drawer-handle]');

  // Shopify injects the <model-viewer> custom element library itself
  // whenever the model_viewer_tag filter is used, so there's no library to
  // load here — just make each rendered viewer a passive, auto-rotating
  // preview instead of Shopify's default interactive/AR viewer.
  function enhanceModelViewers(container) {
    container.querySelectorAll('model-viewer').forEach(function (viewer) {
      if (viewer.dataset.rogEnhanced) {
        return;
      }
      viewer.dataset.rogEnhanced = 'true';
      viewer.removeAttribute('camera-controls');
      viewer.setAttribute('auto-rotate', '');
      viewer.setAttribute('rotation-per-second', '8deg');
      viewer.setAttribute('interaction-prompt', 'none');
      viewer.setAttribute('disable-zoom', '');
      viewer.setAttribute('disable-pan', '');
    });
  }

  // Enhance any model-viewers already on the page (e.g. a standalone
  // product or cart page) without waiting for the drawer to open.
  enhanceModelViewers(document);

  // --- Open / close -------------------------------------------------------

  function isOpen() {
    return root.classList.contains('is-open');
  }

  function open() {
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('cart-drawer-locked');
    enhanceModelViewers(document);
  }

  function close() {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('cart-drawer-locked');
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-cart-drawer-open]')) {
      event.preventDefault();
      open();
    } else if (event.target.closest('[data-cart-drawer-close]')) {
      event.preventDefault();
      close();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      close();
    }
  });

  // --- Drag-to-close --------------------------------------------------------
  // The drawer's origin is the left edge of the screen; grabbing the handle
  // at the right edge and dragging it back toward that origin closes it.

  if (handle && panel) {
    var dragging = false;
    var dragStartX = 0;
    var panelWidth = 0;

    handle.addEventListener('pointerdown', function (event) {
      dragging = true;
      dragStartX = event.clientX;
      panelWidth = panel.getBoundingClientRect().width;
      panel.classList.add('is-dragging');
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener('pointermove', function (event) {
      if (!dragging) {
        return;
      }
      var delta = Math.min(0, event.clientX - dragStartX);
      var translate = Math.max(-panelWidth, delta);
      panel.style.transform = 'translateX(' + translate + 'px)';
    });

    function endDrag(event) {
      if (!dragging) {
        return;
      }
      dragging = false;
      panel.classList.remove('is-dragging');
      panel.style.transform = '';

      var delta = Math.min(0, event.clientX - dragStartX);
      if (panelWidth > 0 && Math.abs(delta) > panelWidth * 0.3) {
        close();
      }
    }

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  // --- Cart mutations (Shopify AJAX Cart API) ------------------------------

  function setLoading(isLoading) {
    root.classList.toggle('is-loading', isLoading);
  }

  function refreshDrawer() {
    var url = window.location.pathname + '?sections=cart-drawer';

    return fetch(url)
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        var html = data['cart-drawer'];
        if (!html) {
          return;
        }

        var parsed = new DOMParser().parseFromString(html, 'text/html');
        var newBody = parsed.querySelector('[data-cart-drawer-body]');
        var newFooter = parsed.querySelector('[data-cart-drawer-footer]');
        var newCount = parsed.querySelector('[data-cart-drawer-count]');

        // Both the drawer and a standalone cart page (if the current page
        // has one) share these same markers, so patch every match on the
        // page rather than a single cached node — whichever UI is visible
        // stays in sync from this one fetch.
        if (newBody) {
          document.querySelectorAll('[data-cart-drawer-body]').forEach(function (el) {
            el.innerHTML = newBody.innerHTML;
          });
        }
        if (newFooter) {
          document.querySelectorAll('[data-cart-drawer-footer]').forEach(function (el) {
            el.innerHTML = newFooter.innerHTML;
          });
        }

        document.querySelectorAll('[data-cart-count]').forEach(function (el) {
          el.textContent = newCount ? newCount.textContent : '0';
        });

        enhanceModelViewers(document);
      })
      .catch(function () {
        // Leave the drawer showing its last known state on network failure.
      });
  }

  function cartChange(payload) {
    setLoading(true);
    return fetch(root.dataset.cartChangeUrl || '/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function () {
        return refreshDrawer();
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function cartAdd(payload) {
    setLoading(true);
    return fetch(root.dataset.cartAddUrl || '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).finally(function () {
      setLoading(false);
    });
  }

  // --- Quantity + remove controls ------------------------------------------

  document.addEventListener('click', function (event) {
    var item = event.target.closest('[data-cart-drawer-item]');
    if (!item) {
      return;
    }

    var line = parseInt(item.dataset.line, 10);
    var input = item.querySelector('[data-cart-qty-input]');

    if (event.target.closest('[data-cart-qty-increase]')) {
      var next = parseInt(input.value, 10) + 1;
      input.value = next;
      cartChange({ line: line, quantity: next });
    } else if (event.target.closest('[data-cart-qty-decrease]')) {
      var prev = Math.max(0, parseInt(input.value, 10) - 1);
      input.value = prev;
      cartChange({ line: line, quantity: prev });
    } else if (event.target.closest('[data-cart-drawer-remove]')) {
      cartChange({ line: line, quantity: 0 });
    }
  });

  document.addEventListener('change', function (event) {
    var input = event.target.closest('[data-cart-qty-input]');
    if (input) {
      var item = input.closest('[data-cart-drawer-item]');
      var line = parseInt(item.dataset.line, 10);
      var quantity = Math.max(0, parseInt(input.value, 10) || 0);
      cartChange({ line: line, quantity: quantity });
      return;
    }

    var select = event.target.closest('.cart-drawer__option-select');
    if (select) {
      handleVariantChange(select);
    }
  });

  function handleVariantChange(select) {
    var group = select.closest('[data-cart-drawer-options]');
    var item = select.closest('[data-cart-drawer-item]');
    if (!group || !item) {
      return;
    }

    var selects = Array.prototype.slice.call(group.querySelectorAll('.cart-drawer__option-select'));
    var selectedValues = selects.map(function (el) {
      return el.value;
    });

    var variants;
    try {
      variants = JSON.parse(group.dataset.variants);
    } catch (error) {
      return;
    }

    var match = variants.find(function (variant) {
      return variant.options.length === selectedValues.length && variant.options.every(function (value, index) {
        return value === selectedValues[index];
      });
    });

    var errorEl = group.querySelector('[data-cart-drawer-option-error]');

    if (!match || !match.available) {
      if (errorEl) {
        errorEl.hidden = false;
      }
      return;
    }

    if (errorEl) {
      errorEl.hidden = true;
    }

    var line = parseInt(item.dataset.line, 10);
    var quantity = parseInt(item.querySelector('[data-cart-qty-input]').value, 10) || 1;

    cartAdd({ id: match.id, quantity: quantity }).then(function () {
      return cartChange({ line: line, quantity: 0 });
    });
  }

  // --- Floating checkout button ---------------------------------------------
  // Sticky within the scrollable item list (so it follows the user up and
  // down as they scroll) plus a slow idle bob matching the site's floating,
  // on-water aesthetic used elsewhere in the theme.

  var bobReduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!bobReduceMotion) {
    var bobTime = Math.random() * 10;

    (function bob() {
      if (isOpen()) {
        bobTime += 0.008;
        // Re-query each frame: the button lives inside the footer markup
        // that refreshDrawer() replaces wholesale after every cart change.
        var checkoutBtn = root.querySelector('[data-cart-drawer-checkout-btn]');
        if (checkoutBtn) {
          var offset = Math.sin(bobTime) * 4;
          checkoutBtn.style.transform = 'translateY(' + offset.toFixed(2) + 'px)';
        }
      }
      window.requestAnimationFrame(bob);
    })();
  }

  // Small public surface so other page scripts (e.g. a product page's
  // add-to-cart form) can refresh the drawer's contents and pop it open
  // after adding an item, without duplicating the cart-fetch logic.
  window.ROGCartDrawer = {
    open: open,
    close: close,
    refresh: refreshDrawer
  };
})();
