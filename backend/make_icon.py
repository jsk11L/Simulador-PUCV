"""
Genera simula.ico para el icono del .exe a partir del mismo diseño que el
favicon.svg (birrete de graduación blanco sobre fondo azul).

Se ejecuta UNA VEZ — el .ico resultante queda checked-in y goversioninfo
lo embebe en cada build. Re-ejecutar solo si querés cambiar el diseño.

Requisito: pip install Pillow
"""

from PIL import Image, ImageDraw


def draw_logo(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fondo azul redondeado.
    radius = int(size * 0.19)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=(30, 64, 175, 255))

    # Birrete: rombo (diamond) en blanco.
    cx = size / 2
    top_y = size * 0.22
    bottom_y = size * 0.56
    left_x = size * 0.16
    right_x = size * 0.84
    mid_y = size * 0.39

    diamond = [
        (cx, top_y),
        (right_x, mid_y),
        (cx, bottom_y),
        (left_x, mid_y),
    ]
    draw.polygon(diamond, fill=(255, 255, 255, 255))

    # Arco de la "cinta" debajo del birrete (la parte que va sobre la cabeza).
    arc_top = size * 0.46
    arc_bottom = size * 0.78
    arc_left = size * 0.28
    arc_right = size * 0.72
    line_w = max(2, int(size * 0.05))

    # Líneas verticales laterales + curva inferior.
    draw.line([(arc_left, arc_top), (arc_left, size * 0.66)], fill="white", width=line_w)
    draw.line([(arc_right, arc_top), (arc_right, size * 0.66)], fill="white", width=line_w)
    draw.arc(
        [(arc_left, size * 0.50), (arc_right, arc_bottom)],
        start=0, end=180,
        fill="white", width=line_w,
    )

    # Tassel: línea desde el borde derecho del birrete hacia abajo + bolita.
    tassel_x = right_x
    tassel_top_y = mid_y
    tassel_bottom_y = size * 0.64
    draw.line(
        [(tassel_x, tassel_top_y), (tassel_x, tassel_bottom_y)],
        fill="white",
        width=max(2, int(size * 0.04)),
    )
    ball_r = max(2, int(size * 0.045))
    draw.ellipse(
        [(tassel_x - ball_r, tassel_bottom_y), (tassel_x + ball_r, tassel_bottom_y + 2 * ball_r)],
        fill="white",
    )

    return img


def main():
    # ICO soporta múltiples tamaños embebidos — Windows elige el más
    # apropiado según el contexto (taskbar, explorer, alt-tab, etc).
    sizes = [256, 128, 64, 48, 32, 16]
    base = draw_logo(256)
    base.save("simula.ico", format="ICO", sizes=[(s, s) for s in sizes])
    print(f"Generated simula.ico ({len(sizes)} sizes: {sizes})")

    # Mismo diseño exportado como PNG 256x256 al directorio del frontend,
    # para que el favicon de la pestaña sea idéntico al icono del .exe.
    favicon_path = "../frontend/public/favicon.png"
    base.save(favicon_path, format="PNG")
    print(f"Generated {favicon_path}")


if __name__ == "__main__":
    main()
