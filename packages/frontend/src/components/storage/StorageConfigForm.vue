<template>
  <Modal :open="open" :title="isEdit ? 'Edit Storage' : 'New Storage'" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="$emit('save', form)">
      <div>
        <label class="label">Name</label>
        <input v-model="form.name" type="text" class="input" required />
      </div>
      <div>
        <label class="label">Driver</label>
        <select v-model="form.driver" class="input">
          <option value="s3">S3 Compatible</option>
          <option value="webdav">WebDAV</option>
          <option value="local">Local</option>
        </select>
      </div>
      <div>
        <label class="label">Config (JSON)</label>
        <textarea v-model="form.configJson" rows="6" class="input font-mono text-xs" />
      </div>
      <div>
        <label class="label">Mount Point</label>
        <input v-model="form.mountPoint" type="text" class="input" placeholder="/" />
      </div>
      <div class="flex justify-end gap-3">
        <button type="button" class="btn-secondary" @click="$emit('close')">{{ $t('common.cancel') }}</button>
        <button type="submit" class="btn-primary">{{ $t('common.save') }}</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import Modal from '@/components/common/Modal.vue';

const props = defineProps<{
  open: boolean;
  isEdit?: boolean;
  initial?: { name: string; driver: string; config_json: string; mount_point: string; is_default?: boolean };
}>();

defineEmits<{
  close: [];
  save: [data: { name: string; driver: string; configJson: string; mountPoint: string; isDefault: boolean }];
}>();

const form = reactive({
  name: '',
  driver: 's3' as string,
  configJson: '{}',
  mountPoint: '/',
  isDefault: false,
});

watch(() => props.open, (val) => {
  if (val && props.initial) {
    form.name = props.initial.name;
    form.driver = props.initial.driver;
    form.configJson = props.initial.config_json;
    form.mountPoint = props.initial.mount_point;
  } else if (val) {
    form.name = '';
    form.driver = 's3';
    form.configJson = '{}';
    form.mountPoint = '/';
  }
});
</script>
