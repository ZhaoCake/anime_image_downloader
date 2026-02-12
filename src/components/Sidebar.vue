<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { Moon, Sun, FolderDown, RefreshCw } from 'lucide-vue-next';
import { ref } from 'vue';

const store = useAppStore();
const { categories, selectedCategory, imageCount, loading, isDarkMode, selectedImages, images } = storeToRefs(store);

const saveFormat = ref<'original' | 'jpg' | 'png'>('original');

function handleFetch() {
    store.fetchImages();
}

function handleBatchSave() {
    store.batchSave(saveFormat.value);
}
</script>

<template>
  <div class="h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col w-64 transition-colors duration-300">
    <!-- Header -->
    <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <h1 class="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
        Anime DL
      </h1>
      <button 
        @click="store.toggleTheme()" 
        class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <Moon v-if="!isDarkMode" class="w-5 h-5 text-gray-600 dark:text-gray-300" />
        <Sun v-else class="w-5 h-5 text-yellow-400" />
      </button>
    </div>

    <!-- Controls -->
    <div class="p-4 flex-1 overflow-y-auto space-y-6">
      
      <!-- Fetch Section -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select 
            v-model="selectedCategory"
            class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2.5"
          >
            <option v-for="cat in categories" :key="cat.enname || cat.name" :value="cat.enname || cat.name">
              {{ cat.name || cat.enname }}
            </option>
          </select>
        </div>

        <div>
           <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Count (1-10)</label>
           <input 
             type="number" 
             v-model="imageCount" 
             min="1" 
             max="10" 
             class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2.5"
           />
        </div>

        <button 
          @click="handleFetch"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw v-if="loading" class="w-4 h-4 animate-spin" />
          <span v-else>Fetch Images</span>
        </button>
      </div>

      <hr class="border-gray-200 dark:border-gray-700" />

      <!-- Save Section -->
      <div class="space-y-4">
        <h3 class="font-medium text-gray-900 dark:text-white">Batch Actions</h3>
        
        <div>
           <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
           <select 
             v-model="saveFormat"
             class="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2.5"
           >
             <option value="original">Original</option>
             <option value="jpg">JPG (Converted)</option>
             <option value="png">PNG (Converted)</option>
           </select>
        </div>

        <button 
          @click="handleBatchSave"
          :disabled="selectedImages.size === 0 || loading"
          class="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FolderDown class="w-4 h-4" />
          <span>Save Selected ({{ selectedImages.size }})</span>
        </button>
        
        <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
             <span>Select All</span>
             <input type="checkbox" 
                class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                :disabled="images.length === 0"
                @change="store.selectAll()" 
                :checked="images.length > 0 && selectedImages.size === images.length"
             />
        </div>
      </div>
    </div>
    
    <!-- Status Footer -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <p v-if="loading">{{ store.progress }}</p>
        <p v-else>Ready. {{ images.length }} images loaded.</p>
    </div>
  </div>
</template>
