<template>
  <div>
    <ErrorAlert v-if="error" :message="error" @dismiss="error = ''" />

    <UserTable
      :users="users"
      @search="handleSearch"
      @create="openCreate"
      @edit="openEdit"
      @delete="handleDelete"
    />

    <UserEditDialog
      :open="showForm"
      :is-edit="!!editingUser"
      :initial="editingUser || undefined"
      @close="closeForm"
      @save="handleSave"
    />

    <ConfirmDialog
      :open="showDeleteConfirm"
      title="Delete User"
      :message="`Delete user? This cannot be undone.`"
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
import UserTable from '@/components/admin/UserTable.vue';
import UserEditDialog from '@/components/admin/UserEditDialog.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const ui = useUiStore();
const users = ref<Array<{
  id: string;
  username: string;
  email: string;
  role: string;
  storage_quota: number;
  used_storage: number;
  is_active: number;
}>>([]);
const error = ref('');
const showForm = ref(false);
const showDeleteConfirm = ref(false);
const editingUser = ref<typeof users.value[0] | null>(null);
const deleteTargetId = ref<string | null>(null);
const searchQuery = ref('');

async function loadUsers(): Promise<void> {
  try {
    const res = await apiClient<{ success: boolean; data: typeof users.value }>('/admin/users');
    users.value = res.data;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

async function handleSearch(q: string): Promise<void> {
  searchQuery.value = q;
  const params = q ? `?search=${encodeURIComponent(q)}` : '';
  try {
    const res = await apiClient<{ success: boolean; data: typeof users.value }>(`/admin/users${params}`);
    users.value = res.data;
  } catch (e) {
    error.value = (e as Error).message;
  }
}

function openCreate(): void {
  editingUser.value = null;
  showForm.value = true;
}

function openEdit(id: string): void {
  editingUser.value = users.value.find((u) => u.id === id) || null;
  showForm.value = true;
}

function closeForm(): void {
  showForm.value = false;
  editingUser.value = null;
}

async function handleSave(data: { username: string; email: string; password?: string; role: string; storage_quota: number }): Promise<void> {
  try {
    const payload = editingUser.value
      ? { email: data.email, role: data.role, storage_quota: data.storage_quota }
      : data;

    if (editingUser.value) {
      await apiClient(`/admin/users/${editingUser.value.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiClient('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
    }
    const wasEditing = !!editingUser.value;
    closeForm();
    loadUsers();
    ui.addToast('success', wasEditing ? 'User updated' : 'User created');
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
    await apiClient(`/admin/users/${deleteTargetId.value}`, { method: 'DELETE' });
    loadUsers();
    ui.addToast('success', 'User deleted');
  } catch (e) {
    error.value = (e as Error).message;
  }
}

onMounted(loadUsers);
</script>
