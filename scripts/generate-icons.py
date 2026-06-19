#!/usr/bin/env python3
"""
Gera os ícones PNG do PWA (somente biblioteca padrão — sem dependências).

Desenha uma "gota de combustível" branca sobre o fundo teal da marca.
Saída em public/icons/.

Uso: python scripts/generate-icons.py
"""
import math
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

BRAND = (13, 148, 136)   # #0d9488
WHITE = (255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def write_png(path, width, height, pixels):
    """pixels: lista de (r,g,b,a) com width*height elementos."""
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filtro None por linha
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # RGBA
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


def in_droplet(nx, ny):
    """nx, ny normalizados em [0,1]. Retorna True dentro da gota."""
    cx, cy, r = 0.5, 0.60, 0.26
    # Parte circular (bulbo).
    if (nx - cx) ** 2 + (ny - cy) ** 2 <= r ** 2:
        return True
    # Ponta (triângulo) acima do círculo, estreitando até o topo.
    apex_y = 0.16
    if apex_y <= ny <= cy:
        t = (ny - apex_y) / (cy - apex_y)  # 0 no topo, 1 no centro do círculo
        half = t * r
        if abs(nx - cx) <= half:
            return True
    return False


def rounded_alpha(nx, ny, radius):
    """Cantos arredondados: retorna alpha (0..255) para o fundo."""
    r = radius
    # distância aos cantos
    for cx, cy in ((r, r), (1 - r, r), (r, 1 - r), (1 - r, 1 - r)):
        inside_corner_box = (
            (cx == r and nx < r or cx != r and nx > 1 - r)
            and (cy == r and ny < r or cy != r and ny > 1 - r)
        )
        if inside_corner_box:
            d = math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2)
            if d > r:
                return 0
    return 255


def build(size, maskable=False):
    pixels = []
    # Em ícones maskable o fundo deve sangrar (sem cantos arredondados) e a
    # arte fica na zona segura central (~70%).
    corner = 0.0 if maskable else 0.18
    scale = 0.70 if maskable else 1.0

    for y in range(size):
        for x in range(size):
            nx = (x + 0.5) / size
            ny = (y + 0.5) / size

            bg_alpha = 255 if maskable else rounded_alpha(nx, ny, corner)
            if bg_alpha == 0:
                pixels.append((0, 0, 0, 0))
                continue

            # Coordenada da arte (reposicionada/escalada para a zona segura).
            ax = (nx - 0.5) / scale + 0.5
            ay = (ny - 0.5) / scale + 0.5

            if 0 <= ax <= 1 and 0 <= ay <= 1 and in_droplet(ax, ay):
                pixels.append((WHITE[0], WHITE[1], WHITE[2], 255))
            else:
                pixels.append((BRAND[0], BRAND[1], BRAND[2], bg_alpha))
    return pixels


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
    ]
    for name, size, maskable in targets:
        path = os.path.join(OUT_DIR, name)
        write_png(path, size, size, build(size, maskable))
        print(f"gerado: {os.path.relpath(path)} ({size}x{size})")


if __name__ == "__main__":
    main()
