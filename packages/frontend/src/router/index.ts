import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/files',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/files',
    name: 'files',
    component: () => import('@/views/FileBrowseView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/files/:id',
    name: 'filesSub',
    component: () => import('@/views/FileBrowseView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/files/:id/edit',
    name: 'fileEdit',
    component: () => import('@/views/FileEditView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/preview/:id',
    name: 'preview',
    component: () => import('@/views/PreviewView.vue'),
  },
  {
    path: '/share/:token',
    name: 'share',
    component: () => import('@/views/ShareView.vue'),
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    component: () => import('@/views/Admin/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', name: 'admin', component: () => import('@/views/Admin/DashboardView.vue') },
      { path: 'users', name: 'adminUsers', component: () => import('@/views/Admin/UsersView.vue') },
      { path: 'storage', name: 'adminStorage', component: () => import('@/views/Admin/StorageConfigView.vue') },
      { path: 'tasks', name: 'adminTasks', component: () => import('@/views/Admin/TaskScheduleView.vue') },
      { path: 'themes', name: 'adminThemes', component: () => import('@/views/Admin/ThemeConfigView.vue') },
      { path: 'webdav', name: 'adminWebdav', component: () => import('@/views/Admin/WebdavConfigView.vue') },
      { path: 'audit', name: 'adminAudit', component: () => import('@/views/Admin/AuditLogView.vue') },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/NotFoundView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
