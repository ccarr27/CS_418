
from PIL import Image

def draw_pix(image, positions, colors):
    pixel = image.load()
    for pos, col in zip(positions, colors):
        x, y = pos
        r, g, b, a = col
        pixel[x, y] = (r, g, b, a)

def file_to_image(input_file):
    positions = []
    colors = []
    with open(input_file, 'r') as file:
        img = None  # Initialize img to None
        for line in file:
            line = line.strip()
            if line.startswith('png'):
                _, width, height, filename = line.split()
                width = int(width)
                height = int(height)
                img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
                img.save(filename)
            elif line.startswith('position'):
                _, _, *coords = line.split()
                for i in range(0, len(coords), 2):
                        x = int(coords[i])
                        y = int(coords[i+1])
                        positions.append((x, y))
            elif line.startswith('color'):
                _, _, *vals = line.split()
                for i in range(0, len(vals), 4):
                    a = int(vals[i])
                    b = int(vals[i+1])
                    c = int(vals[i+2])
                    d = int(vals[i+3])
                    colors.append((a, b, c, d))
            elif line.startswith('drawPixels'):
                if img is None:
                    raise ValueError("Image not initialized. Please check the input file.")
                _, num_pixels = line.split()
                num_pixels = int(num_pixels)
                # Ensure we don't exceed available positions or colors
                num_pixels = min(num_pixels, len(positions), len(colors))
                draw_pix(img, positions[:num_pixels], colors[:num_pixels])
                img.save(filename)

if __name__ == "__main__":
    import sys
    file_to_image(sys.argv[1])