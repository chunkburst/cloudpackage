<template>
  <Modal :open="open" :title="$t('file.rename')" size="sm" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label class="label">New name</label>
        <input ref="nameRef" v-model="name" type="text" class="input" required />
      </div>
      <div class="flex justify-end gap-3">
        <button type="button" class="btn-secondary" @click="$emit('close')">{{ $t('common.cancel') }}</button>
        <button type="submit" class="btn-primary">{{ $t('common.save') }}</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import Modal from '@/components/common/Modal.vue';

const props = defineProps<{ open: boolean; currentName: string }>();
const emit = defineEmits<{ close: []; rename: [newName: string] }>();

const name = ref(props.currentName);
const nameRef = ref<HTMLInputElement | null>(null);

watch(() => props.open, async (val) => {
  if (val) {
    name.value = props.currentName;
    await nextTick();
    nameRef.value?.focus();
    nameRef.value?.select();
  }
});

function handleSubmit(): void {
  if (name.value.trim()) {
    emit('rename', name.value.trim());
  }
}
</script>
