#!/usr/bin/env python3
"""
Process Higgsfield brand renders into web/mobile PNG sizes.

Reads from `.cursor/assets/higgsfield-brand/` (not committed) and writes
transparent marks, opaque app icons, OG banner, and feature miniatures.
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / ".cursor/assets/higgsfield-brand"
WEB_BRAND = ROOT / "apps/web/public/brand"
WEB_FEATURES = WEB_BRAND / "features"
WEB_NAV = WEB_BRAND / "nav"
WEB_APP = ROOT / "apps/web/src/app"
MOB = ROOT / "apps/mobile/assets"
INK = (21, 23, 28, 255)


def key_dark_background(img: Image.Image) -> Image.Image:
    """Knock out near-ink / near-black canvas; keep gold + pink pigment."""
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
            sat = mx - min(r, g, b)
            if mx <= 14:
                dpx[x, y] = (0, 0, 0, 0)
                continue
            if mx < 52 and sat < 18:
                dpx[x, y] = (0, 0, 0, 0)
                continue
            dpx[x, y] = (r, g, b, a)
    return out


def key_cream_background(img: Image.Image) -> Image.Image:
    """Knock out cream / off-white canvas used by claymorphic renders."""
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
            if mx >= 220 and (mx - mn) < 28:
                dpx[x, y] = (0, 0, 0, 0)
                continue
            dpx[x, y] = (r, g, b, a)
    return out


def flood_remove_canvas(img: Image.Image, *, cream: bool = False) -> Image.Image:
    px = img.load()
    w, h = img.size
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def is_canvas(r: int, g: int, b: int, a: int) -> bool:
        if a == 0:
            return True
        mx = max(r, g, b)
        sat = mx - min(r, g, b)
        if cream:
            return mx >= 220 and sat < 28
        return mx <= 48 and sat <= 16

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


def crop_to_content(img: Image.Image, pad: int = 8) -> Image.Image:
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


def opaque_on_ink(img: Image.Image, size: int) -> Image.Image:
    mark = img.resize((size, size), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (size, size), INK)
    out.alpha_composite(mark)
    return out.convert("RGB")


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)


def fit_cover(img: Image.Image, width: int, height: int) -> Image.Image:
    src = img.convert("RGB")
    scale = max(width / src.width, height / src.height)
    nw = max(width, int(round(src.width * scale)))
    nh = max(height, int(round(src.height * scale)))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - width) // 2
    top = (nh - height) // 2
    return resized.crop((left, top, left + width, top + height))


def add_transparent_margin(img: Image.Image, ratio: float) -> Image.Image:
    pad = max(8, int(max(img.size) * ratio))
    out = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), (0, 0, 0, 0))
    out.paste(img, (pad, pad), img)
    return out


def transparent_mark(path: Path, *, cream: bool = False, pad_ratio: float = 0.0) -> Image.Image:
    keyed = key_cream_background(Image.open(path)) if cream else key_dark_background(Image.open(path))
    cropped = crop_to_content(flood_remove_canvas(keyed, cream=cream))
    if pad_ratio > 0:
        cropped = add_transparent_margin(cropped, pad_ratio)
    return square_canvas(cropped)


def main() -> None:
    mark_src = SRC / "22-logo-detailed.png"
    if not mark_src.exists():
        mark_src = SRC / "01-favicon.png"
    if not mark_src.exists():
        raise SystemExit(f"Missing {mark_src} — generate the Higgsfield kit first")

    master = transparent_mark(mark_src)
    WEB_BRAND.mkdir(parents=True, exist_ok=True)
    WEB_APP.mkdir(parents=True, exist_ok=True)
    MOB.mkdir(parents=True, exist_ok=True)

    save_png(master.resize((1024, 1024), Image.Resampling.LANCZOS), WEB_BRAND / "logo.png")
    for size in (32, 192, 512, 1024):
        save_png(
            master.resize((size, size), Image.Resampling.LANCZOS),
            WEB_BRAND / f"logo-{size}.png",
        )

    save_png(opaque_on_ink(master, 512), WEB_APP / "icon.png")
    save_png(opaque_on_ink(master, 180), WEB_APP / "apple-icon.png")
    save_png(opaque_on_ink(master, 1024), MOB / "icon.png")
    save_png(opaque_on_ink(master, 512), MOB / "adaptive-icon.png")

    splash = Image.new("RGBA", (1284, 1284), INK)
    mark = master.resize((640, 640), Image.Resampling.LANCZOS)
    splash.alpha_composite(mark, ((1284 - 640) // 2, (1284 - 640) // 2))
    save_png(splash.convert("RGB"), MOB / "splash.png")

    og = fit_cover(Image.open(SRC / "02-og-left.png"), 1200, 630)
    save_png(og, WEB_BRAND / "og-image.png")
    save_png(fit_cover(Image.open(SRC / "11-og-center.png"), 1200, 630), WEB_BRAND / "og-center.png")

    clay_src = SRC / "24-logo-clay-cream.png"
    if clay_src.exists():
        clay = transparent_mark(clay_src, cream=True).resize((1024, 1024), Image.Resampling.LANCZOS)
        save_png(clay, WEB_BRAND / "logo-clay.png")

    features = {
        "swap": "03-swap.png",
        "liquidity": "04-liquidity.png",
        "launchpad": "05-launchpad.png",
        "fair-launch": "06-fair-launch.png",
        "discover": "07-discover.png",
        "wallet": "08-wallet.png",
        "simulation": "09-simulation.png",
        "locked": "10-locked.png",
        "buy-sell": "20-buy-sell.png",
        "learn": "21-learn.png",
        "buy-sell-clay": "26-buy-sell-clay.png",
        "learn-clay": "27-learn-clay.png",
    }
    WEB_FEATURES.mkdir(parents=True, exist_ok=True)
    for slug, filename in features.items():
        src = SRC / filename
        if not src.exists():
            continue
        cream = "clay" in filename
        icon = transparent_mark(src, cream=cream).resize((512, 512), Image.Resampling.LANCZOS)
        save_png(icon, WEB_FEATURES / f"{slug}.png")

    nav_icons = {
        "swap": "30-nav-swap.png",
        "buy-sell": "30-nav-buy-sell.png",
        "liquidity": "30-nav-liquidity.png",
        "discover": "30-nav-discover.png",
        "learn": "30-nav-learn.png",
        "launchpad": "30-nav-launchpad.png",
        "wallet": "30-nav-wallet.png",
        "profile": "30-nav-profile.png",
        "admin": "30-nav-admin.png",
        "metrics": "31-nav-metrics.png",
        "agents": "31-nav-agents.png",
        "fees": "31-nav-fees.png",
        "users": "31-nav-users.png",
        "audit": "31-nav-audit.png",
        "simulation": "31-nav-simulation.png",
    }
    WEB_NAV.mkdir(parents=True, exist_ok=True)
    for slug, filename in nav_icons.items():
        src = SRC / filename
        if not src.exists():
            continue
        icon = transparent_mark(src, cream=True, pad_ratio=0.18).resize(
            (512, 512), Image.Resampling.LANCZOS
        )
        save_png(icon, WEB_NAV / f"{slug}.png")

    px = master.load()
    w, h = master.size
    transparent = sum(1 for y in range(h) for x in range(w) if px[x, y][3] == 0)
    print(f"Master mark {w}x{h}, {100 * transparent / (w * h):.1f}% transparent")
    print(f"Wrote brand assets under {WEB_BRAND}")


if __name__ == "__main__":
    main()
