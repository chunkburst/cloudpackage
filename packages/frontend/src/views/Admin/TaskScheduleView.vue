<template>
  <div>
    <ErrorAlert v-if="error" :message="error" @dismiss="error = ''" />

    <TaskList
      :tasks="tasks"
      @create="openCreate"
      @run="handleRun"
      @edit="openEdit"
      @delete="handleDelete"
    />

    <TaskForm
      :open="showForm"
      :is-edit="!!editingTask"
      :initial="editingTask || undefined"
      @close="closeForm"
      @save="handleSave"
    />

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Delete Task"
      message="Are you sure?"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiClient } from '@/api/client';
import { useUiStore } from '@/stores/ui.store';
import TaskList from '@/components/admin/TaskList.vue';
import TaskForm from '@/components/admin/TaskForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const ui = useUiStore();

interface Task {
  id: string;
  name: string;
  task_type: string;
  cron_expression: string;
  is_active: number;
  last_run_at: string | null;
  last_run_status: string | null;
  config_json: string | null;
}

const tasks = ref<Task[]>([]);
const error = ref('');
const showForm = ref(false);
const showDeleteConfirm = ref(false);
const editingTask = ref<Task | null>(null);
const deleteTargetId = ref<string | null>(null);

async function load(): Promise<void> {
  try {
    const res = await apiClient<{ success: boolean; data: Task[] }>('/tasks');
    tasks.value = res.data;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function openCreate(): void {
  editingTask.value = null;
  showForm.value = true;
}

function openEdit(id: string): void {
  editingTask.value = tasks.value.find((t) => t.id === id) || null;
  showForm.value = true;
}

function closeForm(): void {
  showForm.value = false;
  editingTask.value = null;
}

async function handleSave(data: { name: string; taskType: string; cronExpression: string; configJson: string }): Promise<void> {
  try {
    if (editingTask.value) {
      await apiClient(`/tasks/${editingTask.value.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: data.name, cron_expression: data.cronExpression, config_json: data.configJson }),
      });
    } else {
      await apiClient('/tasks', {
        method: 'POST',
        body: JSON.stringify({ name: data.name, task_type: data.taskType, cron_expression: data.cronExpression, config_json: data.configJson }),
      });
    }
    closeForm();
    load();
    ui.addToast('success', editingTask.value ? 'Task updated' : 'Task created');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function handleRun(id: string): Promise<void> {
  try {
    await apiClient(`/tasks/${id}/run`, { method: 'POST' });
    ui.addToast('success', 'Task triggered');
    load();
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function handleDelete(id: string): void {
  deleteTargetId.value = id;
  showDeleteConfirm.value = true;
}

async function confirmDelete(): Promise<void> {
  showDeleteConfirm.value = false;
  if (!deleteTargetId.value) return;
  try {
    await apiClient(`/tasks/${deleteTargetId.value}`, { method: 'DELETE' });
    load();
    ui.addToast('success', 'Task deleted');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

onMounted(load);
</script>
