<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ $t('admin.storage') }}</h2>
      <button class="btn-primary !text-xs" @click="openCreate">+ Add Config</button>
    </div>

    <ErrorAlert v-if="error" :message="error" @dismiss="error = ''" />

    <StorageConfigList
      :configs="configs"
      @test="handleTest"
      @edit="openEdit"
      @delete="handleDelete"
    />

    <StorageConfigForm
      :open="showForm"
      :is-edit="!!editingConfig"
      :initial="editingConfig || undefined"
      @close="closeForm"
      @save="handleSave"
    />

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Delete Storage Config"
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
import StorageConfigList from '@/components/storage/StorageConfigList.vue';
import StorageConfigForm from '@/components/storage/StorageConfigForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const ui = useUiStore();

interface Config {
  id: string;
  name: string;
  driver: string;
  mount_point: string;
  is_default: number;
  is_active: number;
  config_json: string;
}

const configs = ref<Config[]>([]);
const error = ref('');
const showForm = ref(false);
const showDeleteConfirm = ref(false);
const editingConfig = ref<{
  name: string;
  driver: string;
  config_json: string;
  mount_point: string;
  is_default?: boolean;
} | null>(null);
const deleteTargetId = ref<string | null>(null);

async function load(): Promise<void> {
  try {
    const res = await apiClient<{ success: boolean; data: Config[] }>('/storage');
    configs.value = res.data;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function openCreate(): void {
  editingConfig.value = null;
  showForm.value = true;
}

function openEdit(id: string): void {
  const c = configs.value.find((x) => x.id === id);
  if (c) {
    editingConfig.value = { name: c.name, driver: c.driver, config_json: c.config_json, mount_point: c.mount_point };
    showForm.value = true;
  }
}

function closeForm(): void {
  showForm.value = false;
  editingConfig.value = null;
}

async function handleSave(data: { name: string; driver: string; configJson: string; mountPoint: string; isDefault: boolean }): Promise<void> {
  try {
    if (editingConfig.value) {
      const id = configs.value.find((c) => c.name === editingConfig.value!.name)?.id;
      if (!id) return;
      await apiClient(`/storage/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          driver: data.driver,
          config_json: data.configJson,
          mount_point: data.mountPoint,
          is_default: data.isDefault,
        }),
      });
    } else {
      await apiClient('/storage', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          driver: data.driver,
          config_json: data.configJson,
          mount_point: data.mountPoint,
          is_default: data.isDefault,
        }),
      });
    }
    closeForm();
    load();
    ui.addToast('success', 'Storage config saved');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function handleTest(id: string): Promise<void> {
  try {
    const res = await apiClient<{ success: boolean; data: { connected: boolean } }>(`/storage/${id}/test`, { method: 'POST' });
    ui.addToast(res.data.connected ? 'success' : 'error', res.data.connected ? 'Connection OK' : 'Connection failed');
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
    await apiClient(`/storage/${deleteTargetId.value}`, { method: 'DELETE' });
    load();
    ui.addToast('success', 'Deleted');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

onMounted(load);
</script>
