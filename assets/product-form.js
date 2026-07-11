(function () {
  function formatMoneyToken(cents, token) {
    var amount = cents / 100;

    switch (token) {
      case 'amount_no_decimals':
        return Math.round(amount).toString();
      case 'amount_with_comma_separator':
        return amount.toFixed(2).replace('.', ',');
      case 'amount_no_decimals_with_comma_separator':
        return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      default:
        return amount.toFixed(2);
    }
  }

  function formatMoney(cents, format) {
    var placeholder = /\{\{\s*(\w+)\s*\}\}/;
    var match = format.match(placeholder);
    if (!match) {
      return format;
    }

    var withValue = format.replace(placeholder, formatMoneyToken(cents, match[1]));
    var el = document.createElement('div');
    el.innerHTML = withValue;
    return el.textContent;
  }

  function initProductForm(root) {
    var group = root.querySelector('[data-product-options]');
    var form = root.querySelector('form');
    var idInput = root.querySelector('[data-product-variant-id]');
    var priceEl = root.querySelector('[data-product-price]');
    var submitBtn = root.querySelector('[data-product-submit]');
    var submitText = root.querySelector('[data-product-submit-text]');
    var errorEl = root.querySelector('[data-product-error]');
    var moneyFormat = window.ROGMoneyFormat || '${{amount}}';

    var variants = [];
    if (group) {
      try {
        variants = JSON.parse(group.dataset.variants);
      } catch (error) {
        variants = [];
      }
    }

    function currentSelection() {
      if (!group) {
        return null;
      }
      var selects = Array.prototype.slice.call(group.querySelectorAll('.product-page__option-select'));
      var values = selects.map(function (select) {
        return select.value;
      });
      return variants.find(function (variant) {
        return variant.options.length === values.length && variant.options.every(function (value, index) {
          return value === values[index];
        });
      });
    }

    function updateForVariant(variant) {
      if (!variant) {
        if (submitBtn) {
          submitBtn.disabled = true;
        }
        if (submitText) {
          submitText.textContent = 'Unavailable';
        }
        return;
      }

      if (idInput) {
        idInput.value = variant.id;
      }
      if (priceEl) {
        priceEl.textContent = formatMoney(variant.price, moneyFormat);
      }
      if (submitBtn) {
        submitBtn.disabled = !variant.available;
      }
      if (submitText) {
        submitText.textContent = variant.available ? 'Add to cart' : 'Sold out';
      }
    }

    if (group) {
      group.addEventListener('change', function () {
        updateForVariant(currentSelection());
      });
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (errorEl) {
          errorEl.hidden = true;
          errorEl.textContent = '';
        }
        if (submitBtn) {
          submitBtn.disabled = true;
        }

        var formData = new FormData(form);

        fetch(root.dataset.cartAddUrl || form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: formData
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) {
                throw new Error(data.description || data.message || 'Unable to add to cart');
              }
              return data;
            });
          })
          .then(function () {
            if (window.ROGCartDrawer) {
              window.ROGCartDrawer.refresh().then(function () {
                window.ROGCartDrawer.open();
              });
            }
          })
          .catch(function (error) {
            if (errorEl) {
              errorEl.hidden = false;
              errorEl.textContent = error.message;
            }
          })
          .finally(function () {
            var variant = currentSelection();
            if (submitBtn) {
              submitBtn.disabled = variant ? !variant.available : false;
            }
          });
      });
    }
  }

  document.querySelectorAll('[data-product-page]').forEach(initProductForm);
})();
