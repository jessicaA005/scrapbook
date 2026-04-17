#!/usr/bin/env python3
"""Generate PWA icons for the scrapbook app."""
import base64, struct, zlib, os

def create_png(size, bg_rgb, text_char='✦'):
    """Create a simple solid-color PNG with a centered symbol."""
    # For a real project, use Pillow or a design tool.
    # This generates a placeholder solid-color PNG.
    w, h = size, size
    
    def png_chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    # IHDR
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    
    # Image data — solid color
    r, g, b = bg_rgb
    row = bytes([0]) + bytes([r, g, b] * w)
    raw = row * h
    compressed = zlib.compress(raw, 6)
    
    png = b'\x89PNG\r\n\x1a\n'
    png += png_chunk(b'IHDR', ihdr)
    png += png_chunk(b'IDAT', compressed)
    png += png_chunk(b'IEND', b'')
    return png

os.makedirs('icons', exist_ok=True)

# Cream/warm brown color matching --accent
bg = (139, 94, 60)   # #8b5e3c

for size in [192, 512]:
    png_data = create_png(size, bg)
    with open(f'icons/icon-{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Created icons/icon-{size}.png')

print('\nIcons created! For a polished icon, replace these with a proper design.')
print('Recommended: use Figma, Canva, or https://maskable.app to create your icon.')
