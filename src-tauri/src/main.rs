#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Learn more about Tauri commands at https://tauri.app
use base64::{engine::general_purpose, Engine as _};
use image::GenericImageView;
use reqwest::header::{HeaderMap, HeaderValue, REFERER, USER_AGENT};
use serde::Serialize;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize)]
struct FetchResult {
    success: bool,
    message: Option<String>,
    images: Option<Vec<ImageData>>,
    categories: Option<serde_json::Value>,
}

#[derive(Serialize, Clone)]
struct ImageData {
    url: String,
    data: String,
    info: ImageInfo,
    filename: String,
}

#[derive(Serialize, Clone)]
struct ImageInfo {
    width: u32,
    height: u32,
    format: String,
    size: String,
    #[serde(rename = "sizeBytes")]
    size_bytes: usize,
    #[serde(rename = "aspectRatio")]
    aspect_ratio: String,
}

#[tauri::command]
async fn get_image_categories() -> FetchResult {
    let url = "https://cnmiw.com/api.php?type=json";

    match reqwest::get(url).await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(data) => {
                if let Some(sort_list) = data.get("sort_list") {
                    FetchResult {
                        success: true,
                        message: None,
                        images: None,
                        categories: Some(sort_list.clone()),
                    }
                } else {
                    FetchResult {
                        success: false,
                        message: Some("获取图像类型失败".to_string()),
                        images: None,
                        categories: None,
                    }
                }
            }
            Err(e) => FetchResult {
                success: false,
                message: Some(format!("Parse error: {}", e)),
                images: None,
                categories: None,
            },
        },
        Err(e) => FetchResult {
            success: false,
            message: Some(format!("Network error: {}", e)),
            images: None,
            categories: None,
        },
    }
}

#[tauri::command]
async fn fetch_image(image_type: String, count: Option<u32>) -> FetchResult {
    let count = count.unwrap_or(1);
    let sort = if image_type.starts_with("CDN") {
        image_type
    } else {
        format!("CDN{}", image_type)
    };
    let url = format!(
        "https://cnmiw.com/api.php?sort={}&type=json&num={}",
        sort, count
    );

    match reqwest::get(&url).await {
        Ok(resp) => match resp.json::<serde_json::Value>().await {
            Ok(data) => {
                let mut urls = Vec::new();
                if let Some(pic) = data.get("pic") {
                    if let Some(list) = pic.as_array() {
                        for p in list {
                            if let Some(s) = p.as_str() {
                                urls.push(s.to_string());
                            }
                        }
                    } else if let Some(s) = pic.as_str() {
                        urls.push(s.to_string());
                    }
                } else {
                    return FetchResult {
                        success: false,
                        message: Some("Invalid response format".to_string()),
                        images: None,
                        categories: None,
                    };
                }

                let mut images = Vec::new();
                for img_url in urls {
                    match fetch_single_image(&img_url).await {
                        Ok(img_data) => images.push(img_data),
                        Err(e) => eprintln!("Failed to fetch {}: {}", img_url, e),
                    }
                }

                if images.is_empty() {
                    FetchResult {
                        success: false,
                        message: Some("所有图像获取失败".to_string()),
                        images: None,
                        categories: None,
                    }
                } else {
                    FetchResult {
                        success: true,
                        message: None,
                        images: Some(images),
                        categories: None,
                    }
                }
            }
            Err(e) => FetchResult {
                success: false,
                message: Some(format!("API Parse Error: {}", e)),
                images: None,
                categories: None,
            },
        },
        Err(e) => FetchResult {
            success: false,
            message: Some(format!("API Network Error: {}", e)),
            images: None,
            categories: None,
        },
    }
}

async fn fetch_single_image(url: &str) -> Result<ImageData, Box<dyn std::error::Error>> {
    let mut headers = HeaderMap::new();
    headers.insert(REFERER, HeaderValue::from_static("https://weibo.com/"));
    headers.insert(USER_AGENT, HeaderValue::from_static("Mozilla/5.0"));

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()?;

    let bytes = client.get(url).send().await?.bytes().await?;
    let info = get_image_info(&bytes);
    let base64_data = general_purpose::STANDARD.encode(&bytes);
    let filename = generate_filename(url, &info);

    Ok(ImageData {
        url: url.to_string(),
        data: base64_data,
        info,
        filename,
    })
}

fn get_image_info(data: &[u8]) -> ImageInfo {
    let size_bytes = data.len();
    let size_kb = format!("{:.2}", size_bytes as f64 / 1024.0);

    match image::load_from_memory(data) {
        Ok(img) => {
            let (width, height) = img.dimensions();
            ImageInfo {
                width,
                height,
                format: "unknown".to_string(),
                size: size_kb,
                size_bytes: size_bytes,
                aspect_ratio: format!("{:.3}", width as f64 / height as f64),
            }
        }
        Err(_) => ImageInfo {
            width: 0,
            height: 0,
            format: "unknown".to_string(),
            size: size_kb,
            size_bytes: size_bytes,
            aspect_ratio: "0".to_string(),
        },
    }
}

fn generate_filename(url: &str, info: &ImageInfo) -> String {
    let now = chrono::Local::now();
    let timestamp = now.format("%Y-%m-%d-%H-%M-%S").to_string();

    let original_filename = url
        .split('/')
        .last()
        .unwrap_or("image.jpg")
        .split('?')
        .next()
        .unwrap_or("image.jpg");

    let dim_info = if info.width > 0 {
        format!("_{}x{}", info.width, info.height)
    } else {
        "".to_string()
    };

    format!("{}{}_{}", timestamp, dim_info, original_filename)
}

#[derive(Serialize)]
struct SaveResult {
    success: bool,
    message: String,
    path: Option<String>,
}

#[tauri::command]
async fn save_image(
    app: AppHandle,
    image_data: String,
    use_default_path: Option<bool>,
    custom_filename: Option<String>,
    save_dir: Option<String>,
) -> SaveResult {
    let use_default = use_default_path.unwrap_or(false);

    let data = match general_purpose::STANDARD.decode(&image_data) {
        Ok(d) => d,
        Err(e) => {
            return SaveResult {
                success: false,
                message: format!("Base64 decode error: {}", e),
                path: None,
            }
        }
    };

    let filename = custom_filename.unwrap_or_else(|| "抓取的图像.jpg".to_string());

    let path_to_save = if use_default {
        if let Some(mut path) = app.path().picture_dir().ok() {
            path.push(&filename);
            path
        } else {
            return SaveResult {
                success: false,
                message: "Could not find picture directory".to_string(),
                path: None,
            };
        }
    } else if let Some(dir) = save_dir {
        PathBuf::from(dir).join(&filename)
    } else {
        let file_path = app
            .dialog()
            .file()
            .set_file_name(&filename)
            .add_filter("Images", &["jpg", "png"])
            .blocking_save_file();

        match file_path {
            Some(p) => p.into_path().unwrap(),
            None => {
                return SaveResult {
                    success: false,
                    message: "Cancelled".to_string(),
                    path: None,
                }
            }
        }
    };

    match File::create(&path_to_save) {
        Ok(mut file) => {
            if let Err(e) = file.write_all(&data) {
                return SaveResult {
                    success: false,
                    message: format!("Write error: {}", e),
                    path: None,
                };
            }
            SaveResult {
                success: true,
                message: "图像保存成功！".to_string(),
                path: Some(path_to_save.to_string_lossy().to_string()),
            }
        }
        Err(e) => SaveResult {
            success: false,
            message: format!("File create error: {}", e),
            path: None,
        },
    }
}

#[tauri::command]
async fn select_directory(app: AppHandle, _options: Option<serde_json::Value>) -> Option<String> {
    app.dialog().file().blocking_pick_folder().map(|p| p.to_string())
}

#[tauri::command]
#[allow(deprecated)]
async fn open_image_folder(app: AppHandle, folder_path: String) -> bool {
    app.shell().open(folder_path, None).is_ok()
}

#[tauri::command]
async fn copy_image_to_clipboard(_app: AppHandle, _image_data: String) -> Result<String, String> {
    Err("Image copy not implemented".to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            get_image_categories,
            fetch_image,
            save_image,
            select_directory,
            open_image_folder,
            copy_image_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
