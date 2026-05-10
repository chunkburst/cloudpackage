import { createApp } from 'vue';
import { createPinia } from 'pinia';
import i18n from './i18n';
import router from './router';
import { registerGuards } from './router/guards';
import App from './App.vue';
import './assets/main.css';

registerGuards(router);

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(i18n);
app.mount('#app');
