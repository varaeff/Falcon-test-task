<script setup lang="ts">
import type { Employee } from '../types';

defineProps<{ employee: Employee | null; busy: boolean; operation: string }>();
const emit = defineEmits<{ logout: [] }>();
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-slate-200 bg-white">
    <div
      class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6"
    >
      <div>
        <p class="eyebrow">Falcon / команда</p>
        <h1 class="mt-1 text-lg font-semibold">Учёт времени</h1>
      </div>
      <div v-if="employee" class="flex items-center gap-3">
        <span class="hidden text-sm text-slate-500 sm:inline">{{ employee.name }}</span>
        <button
          class="text-sm font-semibold text-slate-600"
          :disabled="busy"
          @click="emit('logout')"
        >
          {{ operation === 'logout' ? 'Выход…' : 'Выйти' }}
        </button>
      </div>
    </div>
  </header>
</template>
