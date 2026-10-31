<script setup lang="ts">
import { ref } from 'vue';
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
  error,
  loading,
  refreshing,
  loaded,
  operation,
  now,
  from,
  to,
  range,
  active,
  groups,
  login,
  addEmployee,
  setAdmin,
  start,
  stop,
  update,
  remove,
  logout,
  refresh,
  loadIntervals,
} = useTracking();

async function handleAddEmployee(name: string) {
  if (await addEmployee(name)) newEmployeeName.value = '';
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <AppHeader
      :employee="employee"
      :busy="!!operation"
      :operation="operation"
      @logout="logout"
    />

    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div
        v-if="error"
        role="alert"
        class="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
      >
        {{ error }}
        <button type="button" class="ml-2 underline" @click="refresh()">
          Повторить загрузку
        </button>
      </div>

      <LoginPanel
        v-if="!session"
        :employees="employees"
        :busy="!!operation"
        :loading="loading"
        :loaded="loaded"
        :operation="operation"
        @login="login"
      />

      <div
        v-else-if="employee"
        class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
      >
        <div class="grid content-start gap-5">
          <TimerPanel
            :active="active"
            :now="now"
            :busy="!!operation"
            :operation="operation"
            @start="start"
            @stop="stop"
          />

          <AdminPanel
            v-if="employee.is_admin"
            v-model:name="newEmployeeName"
            :employees="employees"
            :busy="!!operation"
            :operation="operation"
            @add="handleAddEmployee"
            @role="setAdmin"
          />
        </div>

        <ReportPanel
          v-model:from="from"
          v-model:to="to"
          :groups="groups"
          :now="now"
          :own-id="employee.id"
          :admin="employee.is_admin"
          :valid="!!range"
          :busy="!!operation"
          :operation="operation"
          :refreshing="refreshing"
          :update="update"
          :load-intervals="loadIntervals"
          @remove="remove"
        />
      </div>

      <p v-else-if="loading || refreshing" role="status" class="text-sm text-slate-500">
        Восстановление сессии…
      </p>
    </main>
  </div>
</template>
