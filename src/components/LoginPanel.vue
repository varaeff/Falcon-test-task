<script setup lang="ts">
import { ref } from 'vue';
import type { Employee } from '../types';
defineProps<{ employees: Employee[]; busy: boolean }>();
const emit = defineEmits<{ login: [id: string] }>();
const selected = ref('');
</script>

<template>
  <section class="card mx-auto max-w-md">
    <p class="eyebrow">Добро пожаловать</p>
    <h2 class="mt-2 text-2xl font-semibold">Выберите сотрудника</h2>
    <p class="mt-2 text-sm text-slate-500">
      Войдите, чтобы продолжить работу с таймером.
    </p>
    <form class="mt-6 grid gap-3" @submit.prevent="emit('login', selected)">
      <label for="employee-select" class="text-sm font-medium text-slate-700"
        >Сотрудник</label
      >
      <div class="relative">
        <select
          id="employee-select"
          v-model="selected"
          class="input w-full appearance-none pr-10"
          :disabled="busy || !employees.length"
          required
        >
          <option disabled value="">Выберите сотрудника</option>
          <option v-for="person in employees" :key="person.id" :value="person.id">
            {{ person.name }}{{ person.is_admin ? ' · администратор' : '' }}
          </option>
        </select>
        <svg
          class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-900"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <button class="button" :disabled="busy || !selected">Войти</button>
      <p v-if="!employees.length" class="text-sm text-slate-500">
        Список сотрудников пуст или недоступен.
      </p>
    </form>
  </section>
</template>
