#!/usr/bin/env python3
# filepath: convert_icon.py
from PIL import Image
import os
import sys

def convert_to_icon(input_path, output_path, size=(256, 256)):
    """
    将输入图像转换为指定尺寸的 PNG 图标
    """
    try:
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # 打开图像
        with Image.open(input_path) as img:
            # 创建一个新的透明背景图像
            icon = Image.new("RGBA", size, (0, 0, 0, 0))
            
            # 调整原图像大小，保持纵横比
            img = img.convert("RGBA")
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # 计算居中位置
            pos_x = (size[0] - img.width) // 2
            pos_y = (size[1] - img.height) // 2
            
            # 将调整后的图像粘贴到新图像上
            icon.paste(img, (pos_x, pos_y), img)
            
            # 保存为 PNG
            icon.save(output_path, "PNG")
            print(f"成功将 {input_path} 转换为 {output_path}")
            
    except Exception as e:
        print(f"转换图像时出错: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # 设置输入和输出路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, "asuka.jpg")
    output_file = os.path.join(script_dir, "app-icon.png")
    
    # 检查输入文件是否存在
    if not os.path.exists(input_file):
        print(f"错误: 找不到输入文件 {input_file}")
        sys.exit(1)
    
    # 转换图像
    convert_to_icon(input_file, output_file)