import { defineStore } from 'pinia';
import { ref } from 'vue';
import { 
  fetchCategories, 
  fetchImageUrls, 
  fetchImageData, 
  type ImageCategory, 
  type ImageInfo 
} from '../services/api';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { convertImage, base64ToUint8Array } from '../utils/image';

export const useAppStore = defineStore('app', () => {
    // State
    const categories = ref<ImageCategory[]>([]);
    const selectedCategory = ref<string>('');
    const imageCount = ref<number>(1);
    
    const images = ref<ImageInfo[]>([]);
    const selectedImages = ref<Set<number>>(new Set()); // Indices of selected images
    const loading = ref<boolean>(false);
    const progress = ref<string>('');
    
    const isDarkMode = ref<boolean>(false);
    
    // Actions
    async function init() {
        // Load Categories
        try {
            const list = await fetchCategories();
            if (list.length > 0) {
                categories.value = list;
                selectedCategory.value = list[0].enname || list[0].name;
            } else {
                // Fallback if API fails or returns empty
                categories.value = [
                    { name: '随机 (Random)', enname: 'random' },
                    { name: 'PC壁纸', enname: 'pc' },
                    { name: 'MP壁纸', enname: 'mp' }
                ];
                selectedCategory.value = 'random';
            }
        } catch (e) {
            console.error("Failed to load categories", e);
             categories.value = [
                { name: '随机 (Random)', enname: 'random' }
            ];
            selectedCategory.value = 'random';
        }
        
        // Load Theme
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            isDarkMode.value = true;
            document.documentElement.classList.add('dark');
        }
    }
    
    function toggleTheme() {
        isDarkMode.value = !isDarkMode.value;
        if (isDarkMode.value) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }
    
    async function fetchImages() {
        loading.value = true;
        progress.value = 'Fetching URLs...';
        images.value = [];
        selectedImages.value.clear();
        
        try {
            const urls = await fetchImageUrls(selectedCategory.value, imageCount.value);
            
            const newImages: ImageInfo[] = [];
            
            for (let i = 0; i < urls.length; i++) {
                progress.value = `Downloading image ${i + 1}/${urls.length}...`;
                try {
                    const data = await fetchImageData(urls[i]);
                    newImages.push({
                        url: urls[i],
                        data: data,
                        format: urls[i].split('.').pop()?.toLowerCase() || 'jpg'
                    });
                } catch (err) {
                    console.error(`Failed to load individual image`, err);
                }
            }
            
            images.value = newImages;
            
        } catch (e: any) {
            console.error(e);
            alert(`Error: ${e.message}`);
        } finally {
            loading.value = false;
            progress.value = '';
        }
    }
    
    function toggleSelection(index: number) {
        if (selectedImages.value.has(index)) {
            selectedImages.value.delete(index);
        } else {
            selectedImages.value.add(index);
        }
    }

    function selectAll() {
        if (selectedImages.value.size === images.value.length) {
            selectedImages.value.clear();
        } else {
            for (let i = 0; i < images.value.length; i++) {
                selectedImages.value.add(i);
            }
        }
    }
    
    // Save Single Image
    async function saveImage(index: number, format: 'original' | 'jpg' | 'png' = 'original') {
        const img = images.value[index];
        if (!img) return;

        try {
            const originalExt = img.url.split('.').pop() || 'jpg';
            const targetExt = format === 'original' ? originalExt : format === 'jpg' ? 'jpeg' : format;
            
            const filePath = await save({
                filters: [{
                    name: 'Image',
                    extensions: [targetExt]
                }],
                defaultPath: `anime_image_${Date.now()}.${targetExt}`
            });
            
            if (!filePath) return; 
            
            let dataToWrite: Uint8Array;
            
            if (format === 'original') {
                dataToWrite = base64ToUint8Array(img.data);
            } else {
                dataToWrite = await convertImage(img.data, format === 'jpg' ? 'jpeg' : 'png');
            }
            
            await writeFile(filePath, dataToWrite);
            
        } catch (e: any) {
            console.error(e);
            alert(`Failed to save: ${e.message}`);
        }
    }
    
    // Batch Save
    async function batchSave(format: 'original' | 'jpg' | 'png' = 'original') {
        const indices = Array.from(selectedImages.value);
        if (indices.length === 0) return;
        
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false,
                title: 'Select Destination Folder'
            });
            
            if (!selectedPath) return;
            
            const dirPath = typeof selectedPath === 'string' ? selectedPath : selectedPath[0];
            
            loading.value = true;
            
            for (let i = 0; i < indices.length; i++) {
                const index = indices[i];
                const img = images.value[index];
                
                progress.value = `Saving ${i + 1}/${indices.length}...`;
                
                const originalExt = img.url.split('.').pop() || 'jpg';
                const targetExt = format === 'original' ? originalExt : format === 'jpg' ? 'jpeg' : format;
                const fileName = `batch_${Date.now()}_${i}.${targetExt}`;
                
                const filePath = await join(dirPath, fileName);
                
                let dataToWrite: Uint8Array;
                if (format === 'original') {
                    dataToWrite = base64ToUint8Array(img.data);
                } else {
                    dataToWrite = await convertImage(img.data, format === 'jpg' ? 'jpeg' : 'png');
                }
                
                await writeFile(filePath, dataToWrite);
            }
            
            alert('Batch save complete!');
            
        } catch (e: any) {
            console.error(e);
            alert(`Batch save failed: ${e.message}`);
        } finally {
            loading.value = false;
            progress.value = '';
        }
    }

    return {
        categories,
        selectedCategory,
        imageCount,
        images,
        selectedImages,
        loading,
        progress,
        isDarkMode,
        init,
        toggleTheme,
        fetchImages,
        toggleSelection,
        selectAll,
        saveImage,
        batchSave
    };
});
