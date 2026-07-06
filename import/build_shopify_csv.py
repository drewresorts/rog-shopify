#!/usr/bin/env python3
"""Build Shopify product import CSV from Products.pdf export."""

import csv
import json
import os
import re
import shutil
import zipfile

import pypdf

SOURCE_PDF = '/Users/drewresorts/Documents/ROG Site/Products.pdf'
SOURCE_IMG = '/Users/drewresorts/Documents/ROG Site'
OUT_DIR = os.path.join(os.path.dirname(__file__))
IMG_DIR = os.path.join(OUT_DIR, 'product-images')
CSV_PATH = os.path.join(OUT_DIR, 'rog-products-import.csv')
ZIP_PATH = os.path.join(OUT_DIR, 'rog-products-import.zip')

DESCRIPTIONS = {
    'raw-indigo-angled-seam-short': {
        'title': 'Raw Indigo Angled Seam Short',
        'body': '<p>F/W 2025 Holiday Sale</p><ul><li>13.5 oz Kuroki Mills Denim</li><li>Gunmetal hardware</li><li>100% Cotton</li><li>Leather patch</li><li>Japanese fabric</li><li>Dry clean or handwash cool, hang dry</li><li>Made in New York</li></ul><p>Justin is 5\'11 and wearing size 30.</p>',
        'type': 'Shorts',
        'tags': 'denim, shorts, indigo, japanese-fabric, made-in-new-york',
        'images': ['download-22.jpg', 'download-8.jpg', 'download-6.jpg', 'download-21.jpg'],
    },
    'row-shirt': {
        'title': 'Row Shirt',
        'body': '<p>F/W 2025 Holiday Sale</p><ul><li>Naturally textured, crumpled effect</li><li>Very soft and breathable</li><li>Mother of pearl buttons</li><li>100% Cotton</li><li>Japanese fabric</li><li>Dry clean or handwash cool, hang dry</li><li>Made in New York</li></ul><p>Justin is 5\'11 and wearing a M.</p>',
        'type': 'Shirts',
        'tags': 'shirt, linen, japanese-fabric, made-in-new-york',
        'images': ['download-25.jpg', 'download-17.jpg', 'download-16.jpg', 'download-26.jpg'],
    },
    'natural-linen-summer-shirt': {
        'title': 'Natural Linen Summer Shirt',
        'body': '<p>F/W 2025 Holiday Sale</p><ul><li>Summer shirt in linen</li><li>Dyed to mimic watercolor paints</li><li>Mother of pearl buttons</li><li>100% Cotton</li><li>Japanese fabric</li><li>Dry clean or handwash cool, hang dry</li><li>Made in New York</li></ul><p>Justin is 5\'11 and wearing an XL.</p>',
        'type': 'Shirts',
        'tags': 'shirt, linen, summer, japanese-fabric, made-in-new-york',
        'images': ['download-19.jpg', 'download-27.jpg', 'download-28.jpg', 'download-20.jpg'],
    },
    'purple-linen-button-up': {
        'title': 'Purple Linen Button Up',
        'body': '<p>F/W 2025 Holiday Sale</p><ul><li>Summer shirt in linen</li><li>Dyed to mimic watercolor paints</li><li>100% Cotton</li><li>Japanese fabric</li><li>Dry clean or handwash cool, hang dry</li><li>Made in New York</li></ul><p>Justin is 5\'11 and wearing an XL.</p>',
        'type': 'Shirts',
        'tags': 'shirt, linen, purple, japanese-fabric, made-in-new-york',
        'images': ['download-30.jpg', 'download-31.jpg', 'download-32.jpg', 'download-18.jpg'],
    },
    'summer-paris-pop-up-tee': {
        'title': 'Summer Paris Pop Up Tee',
        'body': '<p>Oversized fit — size down for normal fit.</p><ul><li>Printed on Hanes Beefy street tee</li><li>Heavyweight tee</li><li>Screenprinted in Richmond</li><li>100% Cotton</li><li>Handwash cool, hang dry</li></ul>',
        'type': 'T-Shirts',
        'tags': 'tee, paris, popup, cotton, screenprint',
        'images': ['download-35.jpg', 'download-34.jpg', 'download-33.jpg', 'download-36.jpg'],
    },
    'teanna-trump': {
        'title': 'Teanna Trump Heavyweight Tank',
        'body': '<ul><li>Heavy weight 3x1 rib knit</li><li>Sourced in LA</li><li>Men\'s size medium</li><li>98% Cotton, 2% Elastane</li><li>Dry clean or handwash cool, hang dry</li><li>Made in New York</li></ul>',
        'type': 'Tanks',
        'tags': 'tank, rib-knit, made-in-new-york',
        'images': ['download-15.jpg', 'download-14.jpg'],
    },
    'shashiko-pajama-pant': {
        'title': 'Shashiko Pajama Pant',
        'body': '<ul><li>Cotton canvas</li><li>Cropped fit</li><li>Elastic back waist</li><li>Hand-stitched shashiko throughout</li><li>100% Cotton</li><li>Japanese fabric</li><li>Dry clean or handwash cool, hang dry</li><li>Made in New York</li></ul>',
        'type': 'Pants',
        'tags': 'pants, shashiko, japanese-fabric, made-in-new-york',
        'images': ['download-23.jpg', 'download-24.jpg', 'download-11.jpg'],
    },
    'rosario-dawson-tank': {
        'title': 'Rosario Dawson Super Stretch Tank',
        'body': '<ul><li>Heavy weight 3x1 rib knit</li><li>Sourced in LA</li><li>One size fits all</li><li>98% Cotton, 2% Elastane</li><li>Dry clean or handwash cool, hang dry</li><li>Made in New York</li></ul>',
        'type': 'Tanks',
        'tags': 'tank, rib-knit, graphic, made-in-new-york',
        'images': ['download-4.jpg', 'download-12.jpg', 'download-1.jpg'],
    },
    'donyale-luna': {
        'title': 'Donyale Luna Super Stretch Tank',
        'body': '<ul><li>Heavy weight 3x1 rib knit</li><li>Sourced in LA</li><li>One size fits all</li><li>98% Cotton, 2% Elastane</li><li>Dry clean or handwash cool, hang dry</li><li>Made in New York</li></ul>',
        'type': 'Tanks',
        'tags': 'tank, rib-knit, graphic, made-in-new-york',
        'images': ['download-29.jpg', 'download-13.jpg', 'download-2.jpg'],
    },
}

HEADERS = [
    'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published',
    'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
    'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
    'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
    'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position',
    'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description', 'Status',
]


def slugify(name: str) -> str:
    s = re.sub(r'\s+', ' ', name).strip().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def parse_products_pdf(path: str) -> list:
    reader = pypdf.PdfReader(path)
    raw = ''.join(page.extract_text() or '' for page in reader.pages)
    fixed = re.sub(r'\s+', ' ', raw).strip()

    for word in ['false', 'true', 'null']:
        pattern = r'\b' + r'\s*'.join(list(word)) + r'\b'
        fixed = re.sub(pattern, word, fixed, flags=re.I)

    fixed = re.sub(r'is_shippabl\s+e', 'is_shippable', fixed)
    fixed = re.sub(r'is_availabl\s+e', 'is_available', fixed)

    products, _ = json.JSONDecoder().raw_decode('[' + fixed + ']')
    return products


def variant_attributes(variant: dict) -> dict:
    for key, value in variant.items():
        if key.strip() == 'attributes' and isinstance(value, dict):
            return value
    return {}


def get_variants(product: dict) -> list:
    with_attrs = [v for v in product['variants'] if variant_attributes(v)]
    if with_attrs:
        return with_attrs
    if product.get('use_default_variant'):
        return [product['variants'][0]]
    return [v for v in product['variants'] if not v.get('is_default')]


def option_names(product: dict, variants: list) -> list:
    attrs = product.get('attributes') or {}
    if attrs:
        return [key.capitalize() for key in attrs.keys()]

    if variants:
        keys = list(variant_attributes(variants[0]).keys())
        return [key.capitalize() for key in keys]

    return []


def copy_images(handle: str, image_names: list) -> list:
    copied = []
    for index, image_name in enumerate(image_names, start=1):
        source = os.path.join(SOURCE_IMG, image_name)
        if not os.path.exists(source):
            continue
        extension = os.path.splitext(image_name)[1]
        destination_name = f'{handle}-{index}{extension}'
        destination = os.path.join(IMG_DIR, destination_name)
        shutil.copy2(source, destination)
        copied.append(destination_name)
    return copied


def build_rows(products: list) -> list:
    rows = []

    for product in products:
        name = re.sub(r'\s+', ' ', product['name']).strip()
        handle = slugify(name)
        meta = DESCRIPTIONS.get(handle, {
            'title': name,
            'body': f'<p>{name}</p>',
            'type': 'Apparel',
            'tags': 'random-object-gallery',
            'images': [],
        })
        variants = get_variants(product)
        names = option_names(product, variants)
        image_paths = copy_images(handle, meta.get('images', []))

        for variant_index, variant in enumerate(variants):
            row = {header: '' for header in HEADERS}
            row['Handle'] = handle

            if variant_index == 0:
                row['Title'] = meta['title']
                row['Body (HTML)'] = meta['body']
                row['Vendor'] = 'Random Object Gallery'
                row['Type'] = meta['type']
                row['Tags'] = meta['tags']
                row['Published'] = 'TRUE'
                row['Gift Card'] = 'FALSE'
                row['SEO Title'] = meta['title']
                row['SEO Description'] = re.sub(r'<[^>]+>', '', meta['body'])[:320]
                row['Status'] = 'active'
                if image_paths:
                    row['Image Src'] = image_paths[0]
                    row['Image Position'] = '1'
                    row['Image Alt Text'] = meta['title']

            attrs = variant_attributes(variant)
            for option_index, option_name in enumerate(names[:3]):
                row[f'Option{option_index + 1} Name'] = option_name
                key = list(attrs.keys())[option_index]
                row[f'Option{option_index + 1} Value'] = attrs.get(key, '')

            inventory = variant.get('inventory')
            row['Variant Inventory Tracker'] = 'shopify'
            row['Variant Inventory Qty'] = str(inventory if inventory is not None else 0)
            row['Variant Inventory Policy'] = 'deny'
            row['Variant Fulfillment Service'] = 'manual'
            row['Variant Price'] = f"{variant['price'] / 100:.2f}"
            row['Variant Requires Shipping'] = 'TRUE'
            row['Variant Taxable'] = 'TRUE'
            row['Variant SKU'] = variant.get('variant_id') or ''
            rows.append(row)

        for position, image_name in enumerate(image_paths[1:], start=2):
            row = {header: '' for header in HEADERS}
            row['Handle'] = handle
            row['Image Src'] = image_name
            row['Image Position'] = str(position)
            row['Image Alt Text'] = meta['title']
            rows.append(row)

    return rows


def write_csv(rows: list) -> None:
    with open(CSV_PATH, 'w', newline='', encoding='utf-8') as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)


def write_zip() -> None:
    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.write(CSV_PATH, arcname='rog-products-import.csv')
        for image_name in sorted(os.listdir(IMG_DIR)):
            archive.write(os.path.join(IMG_DIR, image_name), arcname=image_name)


def main() -> None:
    os.makedirs(IMG_DIR, exist_ok=True)
    for existing in os.listdir(IMG_DIR):
        os.remove(os.path.join(IMG_DIR, existing))

    products = parse_products_pdf(SOURCE_PDF)
    rows = build_rows(products)
    write_csv(rows)
    write_zip()

    print(f'Products: {len(products)}')
    print(f'CSV rows: {len(rows)}')
    print(f'CSV: {CSV_PATH}')
    print(f'ZIP: {ZIP_PATH}')


if __name__ == '__main__':
    main()
