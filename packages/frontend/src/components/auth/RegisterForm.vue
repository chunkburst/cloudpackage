<template>
  <form class="space-y-4" @submit.prevent="handleRegister">
    <ErrorAlert :message="error" @dismiss="error = ''" />

    <div>
      <label class="label" for="reg-username">{{ $t('auth.username') }}</label>
      <input id="reg-username" v-model="username" type="text" class="input" required />
    </div>

    <div>
      <label class="label" for="reg-email">{{ $t('auth.email') }}</label>
      <input id="reg-email" v-model="email" type="email" class="input" required />
    </div>

    <div>
      <label class="label" for="reg-password">{{ $t('auth.password') }}</label>
      <input id="reg-password" v-model="password" type="password" class="input" required minlength="6" />
    </div>

    <div>
      <label class="label" for="reg-confirm">{{ $t('auth.confirmPassword') }}</label>
      <input id="reg-confirm" v-model="confirmPassword" type="password" class="input" required />
    </div>

    <button type="submit" class="btn-primary w-full" :disabled="loading">
      <LoadingSpinner v-if="loading" size="sm" class="mr-2" />
      {{ $t('auth.register') }}
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
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');

async function handleRegister(): Promise<void> {
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await auth.register(username.value, email.value, password.value);
    ui.addToast('success', 'Registration successful');
    router.push('/files');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>
