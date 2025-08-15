# File: backend/utils/image_processor.py
import base64
from PIL import Image
from io import BytesIO

def process_image_data(image_data_url):
    """
    Process and optimize image data from base64 data URL
    """
    try:
        # Remove data URL prefix if present
        if ',' in image_data_url:
            image_data = image_data_url.split(',')[1]
        else:
            image_data = image_data_url
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        
        # Open image with PIL
        img = Image.open(BytesIO(image_bytes))
        
        # Convert RGBA to RGB if necessary
        if img.mode == 'RGBA':
            # Create a white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large (max 2048px on longest side)
        max_size = 2048
        if max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Optimize image quality
        output_buffer = BytesIO()
        img.save(output_buffer, format='JPEG', quality=85, optimize=True)
        
        # Convert back to base64
        optimized_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
        
        return optimized_base64
        
    except Exception as e:
        raise Exception(f"Image processing failed: {str(e)}")

def extract_dominant_colors(image_data):
    """
    Extract dominant colors from image for theme analysis
    """
    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        img = Image.open(BytesIO(image_bytes))
        
        # Simple color extraction without sklearn
        # Resize for faster processing
        img.thumbnail((150, 150))
        
        # Convert to RGB
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Get most common colors
        colors = img.getcolors(maxcolors=256)
        if colors:
            # Sort by frequency and get top 5
            colors = sorted(colors, key=lambda x: x[0], reverse=True)[:5]
            hex_colors = ['#%02x%02x%02x' % color[1] for color in colors]
            return hex_colors
        
        return []
        
    except Exception:
        return []

def validate_image_size(image_data):
    """
    Validate image size and dimensions
    """
    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Check file size (10MB limit)
        if len(image_bytes) > 10 * 1024 * 1024:
            return False, "Image size exceeds 10MB limit"
        
        # Check dimensions
        img = Image.open(BytesIO(image_bytes))
        if img.width > 4096 or img.height > 4096:
            return False, "Image dimensions exceed 4096px limit"
        
        return True, "Valid"
        
    except Exception as e:
        return False, str(e)