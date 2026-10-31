<script setup lang="ts">
import { ref } from 'vue';
import { api } from './api/tracking';
import { useTracking } from './composables/useTracking';
import LoginPanel from './components/LoginPanel.vue';
import TimerPanel from './components/TimerPanel.vue';
import AdminPanel from './components/AdminPanel.vue';
import ReportPanel from './components/ReportPanel.vue';
import AppHeader from './components/AppHeader.vue';

const newEmployeeName = ref('');

const {
  session,
  employee,
  employees,
  entries,
  error,
  busy,
  now,
  from,
  to,
  range,
  active,
  visible,
  total,
  entryDuration,
  login,
  addEmployee,
  logout,
  withSession,
} = useTracking();

async function handleAddEmployee(name: string) {
  if (await addEmployee(name)) newEmployeeName.value = '';
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <AppHeader :employee="employee" :busy="busy" @logout="logout" />

    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div
        v-if="error"
        role="alert"
        class="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
      >
        {{ error }}
      </div>

      <LoginPanel v-if="!session" :employees="employees" :busy="busy" @login="login" />

      <div
        v-else-if="employee"
        class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
      >
        <div class="grid content-start gap-5">
          <TimerPanel
            :active="active"
            :now="now"
            :busy="busy"
            @start="(description) => withSession((s) => api.start(s, description))"
            @stop="withSession(api.stop)"
          />

          <AdminPanel
            v-if="employee.is_admin"
            v-model:name="newEmployeeName"
            :employees="employees"
            :busy="busy"
            @add="handleAddEmployee"
            @role="(id, admin) => withSession((s) => api.setAdmin(s, id, admin))"
          />
        </div>

        <ReportPanel
          v-model:from="from"
          v-model:to="to"
          :employees="employees"
          :entries="visible"
          :all-entries="entries"
          :now="now"
          :own-id="employee.id"
          :admin="employee.is_admin"
          :valid="!!range"
          :busy="busy"
          :total="total"
          :entry-duration="entryDuration"
          :update="
            (id, description, start, end) =>
              withSession((s) => api.update(s, id, description, start, end))
          "
          @remove="(id) => withSession((s) => api.remove(s, id))"
        />
      </div>

      <p v-else class="text-sm text-slate-500">Восстановление сессии…</p>
    </main>
  </div>
</template>
