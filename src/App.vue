<script setup lang="ts">
import Sidebar from './components/Sidebar.vue';
import ImageGrid from './components/ImageGrid.vue';
import { useAppStore } from './stores/app';
import { onMounted } from 'vue';

const store = useAppStore();

onMounted(() => {
  store.init();
});
</script>

<template>
  <div class="flex h-screen w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
    <Sidebar />
    <main class="flex-1 flex flex-col min-h-0 min-w-0 relative overflow-hidden">
      <!-- ImageGrid handles its own internal scrolling -->
      <ImageGrid class="flex-1" />
    </main>
  </div>
</template>
