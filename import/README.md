# Shopify Product Import

This folder contains a Shopify-ready product CSV generated from `Products.pdf`, plus renamed product images.

## Files

| File | Purpose |
|------|---------|
| `rog-products-import.csv` | Product import spreadsheet |
| `rog-products-import.zip` | CSV + images bundle for Shopify import |
| `product-images/` | Renamed JPGs referenced in the CSV |
| `build_shopify_csv.py` | Regenerate CSV from the PDF export |

## Import into Shopify

1. In Shopify admin, go to **Products → Import**.
2. Upload **`rog-products-import.zip`** (recommended) or upload the CSV and images separately.
3. Shopify matches `Image Src` filenames to images included in the ZIP.
4. Review the import preview, then confirm.

## What's included

**9 products** from the PDF export:

| Product | Variants | Price range |
|---------|----------|-------------|
| Raw Indigo Angled Seam Short | Sizes 28–40 | $161.50 |
| Row Shirt | S, XXL | $140.00 |
| Natural Linen Summer Shirt | L, XL | $98.00 / $140.00 |
| Purple Linen Button Up | L | $140.00 |
| Summer Paris Pop Up Tee | Black/White × M–XXL | $20.00 |
| Teanna Trump Heavyweight Tank | M | $125.00 |
| Shashiko Pajama Pant | Sizes 28–36 | $175.00 |
| Rosario Dawson Super Stretch Tank | One size | $100.00 |
| Donyale Luna Super Stretch Tank | One size | $100.00 |

Descriptions were added from the Random Object Gallery product copy. Inventory quantities and variant SKUs come directly from the PDF export.

## Regenerating

If `Products.pdf` is updated:

```bash
python3 import/build_shopify_csv.py
```

Requires `pypdf` (`pip install pypdf`).

## Notes

- Prices in the PDF were stored in cents and converted to dollars.
- Products with zero inventory are still included so you can manage stock in Shopify.
- `Variant SKU` uses the original export `variant_id` values.
