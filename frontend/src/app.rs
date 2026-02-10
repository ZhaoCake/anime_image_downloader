use leptos::*;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// Define the API types (mirroring Rust Backend)
#[derive(Serialize, Deserialize, Clone, Debug)]
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

#[derive(Serialize, Deserialize, Clone, Debug)]
struct ImageData {
    url: String,
    data: String, // Base64
    info: ImageInfo,
    filename: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct FetchResult {
    success: bool,
    message: Option<String>,
    images: Option<Vec<ImageData>>,
    categories: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
struct FetchArgs {
    image_type: String,
    count: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
struct SaveArgs {
    image_data: String,
    use_default_path: Option<bool>,
    custom_filename: Option<String>,
    save_dir: Option<String>,
}

// Tauri Invoke helper
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ["window", "__TAURI__", "core"])]
    async fn invoke(cmd: &str, args: JsValue) -> JsValue;
}

async fn fetch_images(image_type: String, count: u32) -> Result<Vec<ImageData>, String> {
    let args = serde_wasm_bindgen::to_value(&FetchArgs {
        image_type,
        count: Some(count),
    }).unwrap();

    let result_val = invoke("fetch_image", args).await;
    let result: FetchResult = serde_wasm_bindgen::from_value(result_val).map_err(|e| e.to_string())?;

    if result.success {
        Ok(result.images.unwrap_or_default())
    } else {
        Err(result.message.unwrap_or_else(|| "Unknown error".to_string()))
    }
}

async fn save_image_cmd(image_data: String, filename: String) -> Result<String, String> {
    let args = serde_wasm_bindgen::to_value(&SaveArgs {
        image_data,
        use_default_path: Some(false), // Always prompt or use defaults handled in backend if true
        custom_filename: Some(filename),
        save_dir: None,
    }).unwrap();

    let result_val = invoke("save_image", args).await;
    // We assume backend returns same structure or similar. 
    // In backend: SaveResult { success: bool, message: String, path: Option<String> }
    #[derive(Deserialize)]
    struct SaveResult { success: bool, message: String }
    
    let result: SaveResult = serde_wasm_bindgen::from_value(result_val).map_err(|e| e.to_string())?;
    
    if result.success {
        Ok(result.message)
    } else {
        Err(result.message)
    }
}

#[component]
pub fn App() -> impl IntoView {
    // State
    let (image_type, set_image_type) = create_signal("top".to_string());
    let (image_count, set_image_count) = create_signal(1u32);
    let (images, set_images) = create_signal::<Vec<ImageData>>(vec![]);
    let (loading, set_loading) = create_signal(false);
    let (preview_index, set_preview_index) = create_signal::<Option<usize>>(None);
    let (error_msg, set_error_msg) = create_signal::<Option<String>>(None);

    // Actions
    let fetch_action = create_action(move |_| {
        let t = image_type.get();
        let c = image_count.get();
        set_loading.set(true);
        set_error_msg.set(None);
        
        async move {
            let res = fetch_images(t, c).await;
            set_loading.set(false);
            match res {
                Ok(new_images) => {
                    // Append or replace? Let's replace for now based on UI "Fetch"
                    set_images.set(new_images);
                },
                Err(e) => set_error_msg.set(Some(e)),
            }
        }
    });

    let save_current_image = create_action(move |_| {
        async move {
            if let Some(idx) = preview_index.get() {
                if let Some(img) = images.with(|imgs| imgs.get(idx).cloned()) {
                    let _ = save_image_cmd(img.data, img.filename).await; // Handle result via toast in future
                }
            }
        }
    });

    view! {
        <div class="app-container">
            // Sidebar
            <aside class="sidebar">
                <div class="logo-area">
                    <i class="bi bi-images"></i>
                    <span>AnimeFetch</span>
                </div>

                <div class="control-group">
                    <label class="control-label">Type</label>
                    <select 
                        class="select-input"
                        on:change=move |ev| set_image_type.set(event_target_value(&ev))
                        prop:value=image_type
                    >
                        <option value="top">精选 (Featured)</option>
                        <option value="random">随机 (Random)</option>
                        <option value="iw233">无色 (No Color)</option>
                        <option value="yin">银发 (Silver Hair)</option>
                        <option value="cat">兽耳 (Cat Ears)</option>
                        <option value="xing">星空 (Starry)</option>
                        <option value="mp">竖屏 (Portrait)</option>
                        <option value="pc">横屏 (Landscape)</option>
                    </select>
                </div>

                <div class="control-group">
                    <label class="control-label">Count</label>
                    <input 
                        type="number" 
                        class="number-input" 
                        min="1" 
                        max="20"
                        on:input=move |ev| {
                            if let Ok(val) = event_target_value(&ev).parse::<u32>() {
                                set_image_count.set(val);
                            }
                        }
                        prop:value=image_count
                    />
                </div>

                <button 
                    class="btn btn-primary" 
                    on:click=move |_| fetch_action.dispatch(())
                    disabled=move || loading.get()
                >
                    {move || if loading.get() { 
                        view! { <i class="bi bi-arrow-repeat spin"></i> " Fetching..." }
                    } else {
                        view! { <i class="bi bi-cloud-download"></i> " Fetch Images" }
                    }}
                </button>

                {move || error_msg.get().map(|msg| view! {
                    <div style="color: #ef4444; font-size: 0.8rem; margin-top: 0.5rem;">
                        <i class="bi bi-exclamation-circle"></i> " " {msg}
                    </div>
                })}
            </aside>

            // Main Content
            <main class="main-content">
                <div class="gallery">
                    {move || {
                        if images.with(|i| i.is_empty()) && !loading.get() {
                            view! {
                                <div class="empty-state">
                                    <i class="bi bi-image empty-icon"></i>
                                    <p>"No images to display"</p>
                                </div>
                            }.into_view()
                        } else {
                            images.with(|img_list| {
                                img_list.iter().enumerate().map(|(idx, img)| {
                                    view! {
                                        <div 
                                            class="image-card"
                                            on:click=move |_| set_preview_index.set(Some(idx))
                                        >
                                            <img 
                                                src=format!("data:image/jpeg;base64,{}", img.data) 
                                                class="image-thumb" 
                                                loading="lazy"
                                            />
                                            <div class="image-overlay">
                                                <span class="image-meta">
                                                    {format!("{}x{}", img.info.width, img.info.height)}
                                                </span>
                                                <span class="image-meta">{&img.info.size} " KB"</span>
                                            </div>
                                        </div>
                                    }
                                }).collect_view()
                            })
                        }
                    }}
                </div>

                // Preview Modal
                {move || preview_index.get().map(|idx| {
                    let current_img = images.with(|imgs| imgs.get(idx).cloned());
                    
                    if let Some(img) = current_img {
                        view! {
                            <div class="preview-modal">
                                <div class="preview-toolbar">
                                    <span style="font-size: 0.9rem; color: #e2e8f0;">{img.filename}</span>
                                    <div class="toolbar-actions">
                                        <button 
                                            class="icon-btn" 
                                            title="Save"
                                            on:click=move |_| save_current_image.dispatch(())
                                        >
                                            <i class="bi bi-download"></i>
                                        </button>
                                        <button 
                                            class="icon-btn" 
                                            title="Close"
                                            on:click=move |_| set_preview_index.set(None)
                                        >
                                            <i class="bi bi-x-lg"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="preview-content">
                                    <button 
                                        class="nav-btn nav-prev"
                                        on:click=move |ev| {
                                            ev.stop_propagation();
                                            if idx > 0 { set_preview_index.set(Some(idx - 1)); }
                                        }
                                        style=if idx == 0 { "opacity: 0.3; pointer-events: none;" } else { "" }
                                    >
                                        <i class="bi bi-chevron-left"></i>
                                    </button>
                                    
                                    <img 
                                        src=format!("data:image/jpeg;base64,{}", img.data)
                                        class="preview-image"
                                    />
                                    
                                    <button 
                                        class="nav-btn nav-next"
                                        on:click=move |ev| {
                                            ev.stop_propagation();
                                            if images.with(|l| idx < l.len() - 1) { 
                                                set_preview_index.set(Some(idx + 1)); 
                                            }
                                        }
                                        style=move || if images.with(|l| idx >= l.len() - 1) { "opacity: 0.3; pointer-events: none;" } else { "" }
                                    >
                                        <i class="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        }
                    } else {
                        view! { <div></div> }
                    }
                })}
            </main>
        </div>
    }
}
