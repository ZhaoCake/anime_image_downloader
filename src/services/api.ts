import { fetch } from '@tauri-apps/plugin-http';

const API_BASE = "https://cnmiw.com/api.php";

export interface ImageCategory {
  name: string;
  enname: string;
}

export interface ImageInfo {
  url: string;
  data: string; // Base64
  format: string;
  width?: number;
  height?: number;
}

export async function fetchCategories(): Promise<ImageCategory[]> {
  try {
      const response = await fetch(`${API_BASE}?type=json`, {
        method: "GET",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        console.warn(`Failed to fetch categories: ${response.statusText}`);
        return [];
      }
      const data = await response.json();
      return (data as any).sort_list || [];
  } catch (e) {
      console.warn("Error fetching categories, using fallback", e);
      return [];
  }
}

export async function fetchImageUrls(category: string, count: number): Promise<string[]> {
    // Ensure category has CDN prefix if needed, based on original code
    // "sortValue = imageType.startsWith("CDN") ? imageType : `CDN${imageType}`"
    const sortValue = category.startsWith("CDN") ? category : `CDN${category}`;
    const url = `${API_BASE}?sort=${encodeURIComponent(sortValue)}&type=json&num=${count}`;
    
    // Original used httpFetchJson which presumably didn't need headers for this call, but we add generic ones just in case
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch image URLs: ${response.statusText}`);
    }
    
    const data = await response.json();
    let imageUrls: string[] = [];
    
    if (Array.isArray((data as any).pic)) {
        imageUrls = (data as any).pic;
    } else if (typeof (data as any).pic === "string") {
        imageUrls = [(data as any).pic];
    }
    
    return imageUrls;
}

export async function fetchImageData(url: string): Promise<string> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Referer": "https://weibo.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch image data from ${url}`);
    }
    
    const buffer = await response.arrayBuffer();
    // Convert ArrayBuffer to Base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
