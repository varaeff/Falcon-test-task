<script setup lang="ts">
import { api } from './api/tracking'
import { useTracking } from './composables/useTracking'
import LoginPanel from './components/LoginPanel.vue'
import TimerPanel from './components/TimerPanel.vue'
import AdminPanel from './components/AdminPanel.vue'
import ReportPanel from './components/ReportPanel.vue'
const { session, employee, employees, error, busy, now, from, to, range, active, visible, total, login, logout, withSession } = useTracking()
</script>
<template>
  <div class="min-h-screen bg-slate-50 text-slate-900"><header class="border-b border-slate-200 bg-white"><div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6"><div><p class="eyebrow">Falcon / команда</p><h1 class="mt-1 text-lg font-semibold">Учёт времени</h1></div><div v-if="employee" class="flex items-center gap-3"><span class="hidden text-sm text-slate-500 sm:inline">{{ employee.name }}</span><button class="text-sm font-semibold text-slate-600" :disabled="busy" @click="logout">Выйти</button></div></div></header>
    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><div v-if="error" role="alert" class="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{{ error }}</div><LoginPanel v-if="!session" :employees="employees" :busy="busy" @login="login" />
      <div v-else-if="employee" class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"><div class="grid content-start gap-5"><TimerPanel :active="active" :now="now" :busy="busy" @start="description => withSession(s => api.start(s, description))" @stop="withSession(api.stop)" /><AdminPanel v-if="employee.is_admin" :employees="employees" :busy="busy" @add="name => withSession(s => api.addEmployee(s, name))" @role="(id, admin) => withSession(s => api.setAdmin(s, id, admin))" /></div><ReportPanel v-model:from="from" v-model:to="to" :employees="employees" :entries="visible" :own-id="employee.id" :admin="employee.is_admin" :valid="!!range" :busy="busy" :total="total" @update="(id, description, start, end) => withSession(s => api.update(s, id, description, start, end))" @remove="id => withSession(s => api.remove(s, id))" /></div><p v-else class="text-sm text-slate-500">Восстановление сессии…</p>
    </main></div>
</template>
