<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { storeToRefs } from 'pinia';
import { Check, Loader } from 'lucide-vue-next';

const store = useAppStore();
const { images, selectedImages, loading } = storeToRefs(store);

// Generate src with proper prefix for display
</script>

<template>
  <div class="h-full w-full overflow-y-auto overflow-x-hidden p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 relative backface-hidden">
    
    <div v-if="loading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm">
        <Loader class="w-12 h-12 text-blue-600 animate-spin" />
    </div>

    <div v-if="images.length === 0 && !loading" class="h-full flex flex-col items-center justify-center text-gray-400">
        <div class="text-6xl mb-4">🖼️</div>
        <p class="text-lg">No images loaded</p>
        <p class="text-sm">Select a category and click fetch</p>
    </div>

    <!-- v-viewer handles the lightbox functionality -->
    <div v-else v-viewer="{ title: false, toolbar: true, movable: true, zoomable: true }" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div 
        v-for="(img, index) in images" 
        :key="index"
        class="relative group aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden border-2 transition-all duration-200"
        :class="selectedImages.has(index) ? 'border-blue-500' : 'border-transparent hover:border-blue-300'"
      >
        <!-- Image Thumbnail -->
        <img 
          :src="`data:image/${img.format === 'jpg' ? 'jpeg' : img.format};base64,${img.data}`" 
          class="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
          alt="Anime Image"
        />

        <!-- Selection Overlay (Prevent propagation to not open viewer when clicking checkbox) -->
        <div 
            class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            :class="{ 'opacity-100': selectedImages.has(index) }"
        >
            <button 
                @click.stop="store.toggleSelection(index)"
                class="w-6 h-6 rounded border flex items-center justify-center transition-colors shadow-sm"
                :class="selectedImages.has(index) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/80 dark:bg-black/50 border-gray-300 dark:border-gray-500 hover:bg-blue-100'"
            >
                <Check v-if="selectedImages.has(index)" class="w-4 h-4" />
            </button>
        </div>

        <!-- Info Badge -->
        <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 px-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
            {{ img.format.toUpperCase() }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom Scrollbar for nicer look */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.dark ::-webkit-scrollbar-thumb {
  background: #475569;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Fix for rendering glitches */
.backface-hidden {
  backface-visibility: hidden;
  transform: translateZ(0);
}
</style>
