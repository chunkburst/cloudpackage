<template>
  <Modal :open="open" :title="$t('share.create')" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="$emit('create', form)">
      <div>
        <label class="label">{{ $t('share.accessType') }}</label>
        <select v-model="form.accessType" class="input">
          <option value="view">{{ $t('share.viewOnly') }}</option>
          <option value="raw">{{ $t('share.rawAccess') }}</option>
          <option value="edit">{{ $t('share.editAccess') }}</option>
        </select>
      </div>
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

    <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <h3 class="text-sm font-semibold mb-2">{{ $t('share.existingLinks') }}</h3>
      <ShareLinkList :links="links" @copy="$emit('copy', $event)" @revoke="$emit('revoke', $event)" />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import Modal from '@/components/common/Modal.vue';
import ShareLinkList from './ShareLinkList.vue';

interface ShareLink {
  id: string;
  token: string;
  access_type: string;
  max_accesses: number | null;
  access_count: number;
  expires_at: string | null;
}

defineProps<{ open: boolean; links: ShareLink[] }>();
defineEmits<{
  close: [];
  create: [form: { password: string; expiresAt: string; maxAccesses: number; accessType: 'view' | 'raw' | 'edit' }];
  copy: [token: string];
  revoke: [token: string];
}>();

const form = reactive<{ password: string; expiresAt: string; maxAccesses: number; accessType: 'view' | 'raw' | 'edit' }>({
  password: '',
  expiresAt: '',
  maxAccesses: 0,
  accessType: 'view',
});
</script>
