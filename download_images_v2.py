"""
Sporthink Gorsel Indirme Scripti - v2
=======================================
sporthink_image_map.json dosyasindaki URL'leri kullanarak
urun gorsellerini frontend/public/images/ klasorune indirir.

Kurulum:  pip install requests
Kullanim: python download_images_v2.py
          python download_images_v2.py --map C:/Users/samet/Downloads/sporthink_image_map.json
"""

import os
import sys
import time
import json
import argparse
import requests
from pathlib import Path

OUTPUT_DIR = Path("frontend/public/images")
DELAY      = 0.3   # saniye
TIMEOUT    = 15

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    "Referer": "https://www.sporthink.com.tr/",
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--map", default=None, help="sporthink_image_map.json dosya yolu")
    args = parser.parse_args()

    # JSON dosyasini bul
    map_path = args.map
    if not map_path:
        # Olasi konumlari dene
        candidates = [
            "sporthink_image_map.json",
            Path.home() / "Downloads" / "sporthink_image_map.json",
            Path.home() / "Desktop" / "sporthink_image_map.json",
        ]
        for c in candidates:
            if Path(c).exists():
                map_path = str(c)
                break

    if not map_path or not Path(map_path).exists():
        print("sporthink_image_map.json bulunamadi!")
        print("Lutfen dosya yolunu belirtin:")
        map_path = input("Yol: ").strip().strip('"')

    with open(map_path, encoding="utf-8") as f:
        image_map = json.load(f)

    print(f"Toplam URL: {len(image_map)}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update(HEADERS)

    success = 0
    skip    = 0
    fail    = 0

    print(f"\n{'='*60}")
    print(f" Gorsel Indirme Basliyor -> {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    for i, (sku, url) in enumerate(image_map.items(), 1):
        # Dosya uzantisini URL'den al
        ext = url.split(".")[-1].lower().split("?")[0]
        if ext not in ("jpg", "jpeg", "png", "webp"):
            ext = "jpg"

        save_path = OUTPUT_DIR / f"{sku}.jpg"

        # Zaten var mi?
        if save_path.exists() and save_path.stat().st_size > 1000:
            skip += 1
            print(f"[{i}/{len(image_map)}] SKIP {sku}")
            continue

        print(f"[{i}/{len(image_map)}] {sku} ...", end=" ", flush=True)

        try:
            resp = session.get(url, timeout=TIMEOUT, stream=True)
            resp.raise_for_status()

            ct = resp.headers.get("Content-Type", "")
            if "image" not in ct and "jpeg" not in ct:
                print(f"SKIP (image degil: {ct})")
                fail += 1
                continue

            with open(save_path, "wb") as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)

            size = save_path.stat().st_size
            if size < 500:
                save_path.unlink()
                print(f"FAIL (cok kucuk: {size}b)")
                fail += 1
            else:
                print(f"OK ({size//1024}KB)")
                success += 1

        except Exception as e:
            print(f"FAIL ({str(e)[:50]})")
            fail += 1

        time.sleep(DELAY)

    print(f"\n{'='*60}")
    print(f" Tamamlandi!")
    print(f"   Indirildi: {success}")
    print(f"   Atlandı:   {skip}")
    print(f"   Basarisiz: {fail}")
    print(f"   Klasor:    {OUTPUT_DIR.resolve()}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
