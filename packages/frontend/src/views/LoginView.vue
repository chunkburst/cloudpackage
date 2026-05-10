<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-primary-600">CloudPackage</h1>
        <p class="text-sm text-gray-500 mt-1">{{ $t('app.tagline') }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold mb-4">{{ $t('auth.login') }}</h2>
        <LoginForm />
        <p class="text-sm text-center mt-4 text-gray-500">
          {{ $t('auth.noAccount') }}
          <router-link to="/register" class="text-primary-600 hover:underline">{{ $t('auth.register') }}</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue';
</script>
