<script setup lang="ts">
import { ref } from 'vue';
import type { Entry } from '../types';
import { formatDuration } from '../domain/report';
defineProps<{ active?: Entry; now: number; busy: boolean; operation: string }>();
const emit = defineEmits<{ start: [description: string]; stop: [] }>();
const description = ref('');
</script>

<template>
  <section class="card">
    <p class="eyebrow">Рабочее время</p>
    <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-2xl font-semibold">Таймер</h2>
      <span class="status">{{ active ? '● Идёт работа' : 'Готов к запуску' }}</span>
    </div>
    <template v-if="active">
      <p class="mt-5 text-slate-600">{{ active.description }}</p>
      <p class="mt-2 text-3xl font-semibold tabular-nums">
        {{ formatDuration(Math.max(0, now - Date.parse(active.started_at))) }}
      </p>
      <p class="mt-2 text-xs text-slate-500">
        Начало: {{ new Date(active.started_at).toLocaleString() }}
      </p>
      <button class="button mt-6" :disabled="busy" @click="emit('stop')">
        {{ operation === 'stop' ? 'Остановка…' : 'Остановить' }}
      </button>
    </template>
    <form
      v-else
      class="mt-5 flex flex-col gap-3 sm:flex-row"
      @submit.prevent="emit('start', description)"
    >
      <input
        v-model="description"
        class="input flex-1"
        required
        placeholder="Над чем вы работаете?"
        aria-label="Описание задачи"
      />
      <button class="button" :disabled="busy || !description.trim()">
        {{ operation === 'start' ? 'Запуск…' : 'Запустить' }}
      </button>
    </form>
  </section>
</template>
