#!/usr/bin/env python3
"""
Edit the brand PNG files in-place: remove the black ChatGPT canvas and export
true RGBA transparency across all web/mobile logo sizes.

Usage:
  python3 scripts/process-brand-logo.py
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".cursor/assets/brand-logo-source.png"
WEB_BRAND = ROOT / "apps/web/public/brand"
WEB_APP = ROOT / "apps/web/src/app"
MOB = ROOT / "apps/mobile/assets"


def key_black_background(img: Image.Image) -> Image.Image:
    """
    Remove ChatGPT's solid #000 canvas and decontaminate AA fringes.

    Pixels were composited as `color * alpha` over black, so brightness ~= alpha.
    Un-premultiply to recover clean RGBA ring edges without a dark matte box.
    """
    src = img.convert("RGBA")
    w, h = src.size
    out = Image.new("RGBA", (w, h))
    spx = src.load()
    dpx = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = spx[x, y]
            if a == 0:
                dpx[x, y] = (0, 0, 0, 0)
                continue

            mx = max(r, g, b)
            mn = min(r, g, b)
            sat = mx - mn

            # Hard-key the flat black canvas.
            if mx <= 12:
                dpx[x, y] = (0, 0, 0, 0)
                continue

            # Drop neutral dark matte (shadow on canvas, not ring pigment).
            if mx < 72 and sat < 42:
                dpx[x, y] = (0, 0, 0, 0)
                continue

            # Un-premultiply from black: fringe alpha follows peak channel.
            alpha = mx
            if alpha < 18:
                dpx[x, y] = (0, 0, 0, 0)
                continue

            scale = 255 / alpha
            dpx[x, y] = (
                min(255, int(r * scale)),
                min(255, int(g * scale)),
                min(255, int(b * scale)),
                alpha,
            )

    return out


def flood_remove_canvas(img: Image.Image) -> Image.Image:
    """Fallback pass: clear any edge-connected neutral dark leftovers."""
    px = img.load()
    w, h = img.size
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def is_canvas(r: int, g: int, b: int, a: int) -> bool:
        if a == 0:
            return True
        mx = max(r, g, b)
        return mx <= 48 and (mx - min(r, g, b)) <= 36

    def add(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not seen[y][x] and is_canvas(*px[x, y]):
            seen[y][x] = True
            q.append((x, y))

    for x in range(w):
        add(x, 0)
        add(x, h - 1)
    for y in range(h):
        add(0, y)
        add(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        add(x + 1, y)
        add(x - 1, y)
        add(x, y + 1)
        add(x, y - 1)
    return img


def drop_neutral_dark(img: Image.Image) -> Image.Image:
    """Remove gray/black shadow matte; keep gold + pink ring colors."""
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx = max(r, g, b)
            sat = mx - min(r, g, b)
            if mx < 78 and sat < 44:
                px[x, y] = (0, 0, 0, 0)
    return img


def crop_to_content(img: Image.Image, pad: int = 6) -> Image.Image:
    px = img.load()
    w, h = img.size
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 10:
                xs.append(x)
                ys.append(y)
    if not xs:
        return img
    left = max(0, min(xs) - pad)
    top = max(0, min(ys) - pad)
    right = min(w, max(xs) + pad + 1)
    bottom = min(h, max(ys) + pad + 1)
    return img.crop((left, top, right, bottom))


def square_canvas(img: Image.Image) -> Image.Image:
    side = max(img.size)
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return out


def save_all(master: Image.Image) -> None:
    WEB_BRAND.mkdir(parents=True, exist_ok=True)
    WEB_APP.mkdir(parents=True, exist_ok=True)
    MOB.mkdir(parents=True, exist_ok=True)

    master.save(WEB_BRAND / "logo.png", "PNG")
    master.save(WEB_BRAND / "og-image.png", "PNG")
    for size in (32, 192, 512, 1024):
        master.resize((size, size), Image.Resampling.LANCZOS).save(
            WEB_BRAND / f"logo-{size}.png", "PNG"
        )
    master.resize((512, 512), Image.Resampling.LANCZOS).save(WEB_APP / "icon.png", "PNG")
    master.resize((180, 180), Image.Resampling.LANCZOS).save(WEB_APP / "apple-icon.png", "PNG")
    master.resize((1024, 1024), Image.Resampling.LANCZOS).save(MOB / "icon.png", "PNG")
    master.resize((512, 512), Image.Resampling.LANCZOS).save(MOB / "adaptive-icon.png", "PNG")

    splash = Image.new("RGBA", (1284, 1284), (0, 0, 0, 0))
    mark = master.resize((640, 640), Image.Resampling.LANCZOS)
    splash.paste(mark, ((1284 - 640) // 2, (1284 - 640) // 2), mark)
    splash.save(MOB / "splash.png", "PNG")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(
            f"Missing source PNG at {SRC}\n"
            "Place the original ChatGPT export there as brand-logo-source.png"
        )
    master = square_canvas(
        crop_to_content(drop_neutral_dark(flood_remove_canvas(key_black_background(Image.open(SRC)))))
    )
    save_all(master)
    px = master.load()
    w, h = master.size
    transparent = sum(1 for y in range(h) for x in range(w) if px[x, y][3] == 0)
    print(f"Wrote transparent PNGs ({w}x{h}, {100 * transparent / (w * h):.1f}% transparent)")


if __name__ == "__main__":
    main()
