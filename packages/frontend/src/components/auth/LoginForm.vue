<template>
  <form class="space-y-4" @submit.prevent="handleLogin">
    <ErrorAlert :message="error" @dismiss="error = ''" />

    <div>
      <label class="label" for="login-username">{{ $t('auth.username') }}</label>
      <input
        id="login-username"
        v-model="username"
        type="text"
        class="input"
        required
        autocomplete="username"
      />
    </div>

    <div>
      <label class="label" for="login-password">{{ $t('auth.password') }}</label>
      <input
        id="login-password"
        v-model="password"
        type="password"
        class="input"
        required
        autocomplete="current-password"
      />
    </div>

    <button type="submit" class="btn-primary w-full" :disabled="loading">
      <LoadingSpinner v-if="loading" size="sm" class="mr-2" />
      {{ $t('auth.login') }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import ErrorAlert from '@/components/common/ErrorAlert.vue';

const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleLogin(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    await auth.login(username.value, password.value);
    ui.addToast('success', 'Login successful');
    router.push('/files');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>
