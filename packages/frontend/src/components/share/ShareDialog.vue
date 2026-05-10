<template>
  <Modal :open="open" :title="$t('share.create')" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="$emit('create', form)">
      <div>
        <label class="label">{{ $t('share.password') }}</label>
        <input v-model="form.password" type="text" class="input" />
      </div>
      <div>
        <label class="label">{{ $t('share.expiresAt') }}</label>
        <input v-model="form.expiresAt" type="datetime-local" class="input" />
      </div>
      <div>
        <label class="label">{{ $t('share.maxAccesses') }}</label>
        <input v-model.number="form.maxAccesses" type="number" min="0" class="input" />
        <p class="text-xs text-gray-400 mt-1">0 = {{ $t('share.unlimited') }}</p>
      </div>
      <div class="flex justify-end gap-3">
        <button type="button" class="btn-secondary" @click="$emit('close')">{{ $t('common.cancel') }}</button>
        <button type="submit" class="btn-primary">{{ $t('share.create') }}</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import Modal from '@/components/common/Modal.vue';

defineProps<{ open: boolean }>();
defineEmits<{ close: []; create: [form: { password: string; expiresAt: string; maxAccesses: number }] }>();

const form = reactive({ password: '', expiresAt: '', maxAccesses: 0 });
</script>
