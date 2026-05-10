<template>
  <Modal :open="open" :title="isEdit ? 'Edit Task' : 'New Task'" @close="$emit('close')">
    <form class="space-y-4" @submit.prevent="$emit('save', form)">
      <div>
        <label class="label">Name</label>
        <input v-model="form.name" type="text" class="input" required />
      </div>
      <div>
        <label class="label">Task Type</label>
        <select v-model="form.taskType" class="input">
          <option value="cleanup">Cleanup</option>
          <option value="sync">Sync</option>
          <option value="reindex">Reindex</option>
          <option value="healthcheck">Healthcheck</option>
        </select>
      </div>
      <div>
        <label class="label">Cron Expression</label>
        <input v-model="form.cronExpression" type="text" class="input" placeholder="*/15 * * * *" required />
      </div>
      <div>
        <label class="label">Config (JSON)</label>
        <textarea v-model="form.configJson" rows="3" class="input font-mono text-xs" />
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
  initial?: { name: string; task_type: string; cron_expression: string; config_json: string | null };
}>();

defineEmits<{
  close: [];
  save: [data: { name: string; taskType: string; cronExpression: string; configJson: string }];
}>();

const form = reactive({
  name: '',
  taskType: 'cleanup',
  cronExpression: '0 * * * *',
  configJson: '{}',
});

watch(() => props.open, (val) => {
  if (val && props.initial) {
    form.name = props.initial.name;
    form.taskType = props.initial.task_type;
    form.cronExpression = props.initial.cron_expression;
    form.configJson = props.initial.config_json || '{}';
  } else if (val) {
    form.name = '';
    form.taskType = 'cleanup';
    form.cronExpression = '0 * * * *';
    form.configJson = '{}';
  }
});
</script>
