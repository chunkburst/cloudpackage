<template>
  <Modal :open="open" :title="isEdit ? 'Edit User' : 'Create User'" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="$emit('save', form)">
      <div>
        <label class="label">Username</label>
        <input v-model="form.username" type="text" class="input" required />
      </div>
      <div>
        <label class="label">Email</label>
        <input v-model="form.email" type="email" class="input" required />
      </div>
      <div v-if="!isEdit">
        <label class="label">Password</label>
        <input v-model="form.password" type="password" class="input" required />
      </div>
      <div>
        <label class="label">Role</label>
        <select v-model="form.role" class="input">
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <div>
        <label class="label">Storage Quota (bytes)</label>
        <input v-model.number="form.storageQuota" type="number" min="0" class="input" />
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

const props = withDefaults(defineProps<{
  open: boolean;
  isEdit?: boolean;
  initial?: { username: string; email: string; role: string; storage_quota: number };
}>(), { isEdit: false });

defineEmits<{
  close: [];
  save: [data: { username: string; email: string; password: string; role: string; storageQuota: number }];
}>();

const form = reactive({
  username: '',
  email: '',
  password: '',
  role: 'user',
  storageQuota: 10737418240, // 10 GB
});

watch(() => props.open, (val) => {
  if (val && props.initial) {
    form.username = props.initial.username;
    form.email = props.initial.email;
    form.role = props.initial.role;
    form.storageQuota = props.initial.storage_quota;
    form.password = '';
  } else if (val) {
    form.username = '';
    form.email = '';
    form.password = '';
    form.role = 'user';
    form.storageQuota = 10737418240;
  }
});
</script>
