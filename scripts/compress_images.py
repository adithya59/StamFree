import os
from PIL import Image

def compress_image(image_path, quality=85):
    try:
        if not os.path.exists(image_path):
            print(f"Error: {image_path} not found.")
            return

        img = Image.open(image_path)
        original_size = os.path.getsize(image_path)
        
        # Resize if too large (e.g., width > 2000px)
        if img.width > 2000:
            ratio = 2000 / img.width
            new_height = int(img.height * ratio)
            img = img.resize((2000, new_height), Image.Resampling.LANCZOS)
            
        img.save(image_path, "JPEG", quality=quality, optimize=True)
        new_size = os.path.getsize(image_path)
        
        print(f"Compressed {image_path}: {original_size/1024/1024:.2f}MB -> {new_size/1024/1024:.2f}MB")
    except Exception as e:
        print(f"Failed to compress {image_path}: {e}")

if __name__ == "__main__":
    assets_dir = os.path.join("d:\\StamFree-1", "assets", "images")
    compress_image(os.path.join(assets_dir, "jungle.jpg"))
    compress_image(os.path.join(assets_dir, "sky.jpg"))
