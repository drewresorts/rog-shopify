# ROG Ripples Theme

A minimal Shopify homepage theme inspired by [Random Object Gallery](https://randomobjectgallery.com/), featuring an interactive WebGL water-ripple background powered by [jquery.ripples](https://github.com/sirxemic/jquery.ripples).

## Features

- Full-viewport hero with cursor-reactive ripple background
- Fixed top-left navigation with live clock
- Centered featured product image overlay
- Optional audio mix player
- Scrollable featured collection grid below the hero

## Setup

1. Install [Shopify CLI](https://shopify.dev/docs/api/shopify-cli)
2. Connect to your store:

```bash
shopify theme dev
```

3. In the theme editor, open the **Home page** template
4. Configure the **Hero with ripples** section:
   - Upload a **background image** (required for the ripple effect)
   - Upload a **featured image** for the centered product shot
   - Set navigation links via **Online Store > Navigation > Main menu**

## Ripple settings

The ripple effect is initialized with:

- `resolution: 512`
- `dropRadius: 20`
- `perturbance: 0.04`
- `interactive: true`

Cursor movement adds subtle drops as you move across the hero. WebGL with floating-point textures is required; unsupported browsers fall back to a static background.

## File structure

```
sections/hero-ripples.liquid   # Homepage hero + ripple init
sections/header.liquid         # Top-left nav + clock
sections/featured-collection.liquid
assets/jquery.min.js
assets/jquery.ripples.js
templates/index.json
```
# rog-shopify
