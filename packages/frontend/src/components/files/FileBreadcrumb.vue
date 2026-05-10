<template>
  <BreadcrumbNav :items="store.breadcrumb" />
</template>

<script setup lang="ts">
import { useFilesStore } from '@/stores/files.store';
import BreadcrumbNav from '@/components/layout/BreadcrumbNav.vue';

const store = useFilesStore();
</script>
