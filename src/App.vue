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
  <div class="flex h-screen w-screen overflow-hidden">
    <Sidebar />
    <main class="flex-1 h-full overflow-hidden relative">
      <ImageGrid />
    </main>
  </div>
</template>
