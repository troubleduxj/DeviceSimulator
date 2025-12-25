import os
from PIL import Image, ImageDraw, ImageFont

def create_icon():
    # Size settings
    size = (512, 512)
    bg_color = "#0f172a" # Slate-900 (Dark Blue/Black)
    primary_color = "#3b82f6" # Blue-500
    accent_color = "#22d3ee" # Cyan-400
    
    # Create image
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw Background (Circle)
    margin = 20
    draw.ellipse([margin, margin, size[0]-margin, size[1]-margin], fill=bg_color)
    
    # Draw Outer Ring
    ring_width = 30
    draw.ellipse([margin, margin, size[0]-margin, size[1]-margin], outline=primary_color, width=ring_width)
    
    # Draw "IoT" Text or Abstract Shape
    # Since we might not have a good font, let's draw a simple Hexagon-like network structure
    
    center_x, center_y = size[0] // 2, size[1] // 2
    radius = 120
    
    # Center Node
    node_radius = 40
    draw.ellipse([center_x-node_radius, center_y-node_radius, center_x+node_radius, center_y+node_radius], fill=accent_color)
    
    # Satellite Nodes
    import math
    num_nodes = 3
    for i in range(num_nodes):
        angle = math.radians(i * (360/num_nodes) - 90)
        node_x = center_x + radius * math.cos(angle)
        node_y = center_y + radius * math.sin(angle)
        
        # Line to center
        draw.line([center_x, center_y, node_x, node_y], fill=primary_color, width=15)
        
        # Node circle
        r = 25
        draw.ellipse([node_x-r, node_y-r, node_x+r, node_y+r], fill="white")

    # Save as PNG
    public_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public')
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
        
    png_path = os.path.join(public_dir, 'icon.png')
    img.save(png_path, 'PNG')
    print(f"Generated PNG icon: {png_path}")
    
    # Save as ICO (Multi-size) for Windows
    build_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'build')
    if not os.path.exists(build_dir):
        os.makedirs(build_dir)
        
    ico_path = os.path.join(build_dir, 'icon.ico')
    # ICO usually includes multiple sizes
    img.save(ico_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    print(f"Generated ICO icon: {ico_path}")

if __name__ == "__main__":
    create_icon()
