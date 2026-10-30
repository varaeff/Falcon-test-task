<script setup lang="ts">
import type { Employee } from '../types'
defineProps<{ employees: Employee[]; busy: boolean }>()
const emit = defineEmits<{ login: [id: string] }>()
</script>
<template>
  <section class="card mx-auto max-w-md">
    <p class="eyebrow">Добро пожаловать</p>
    <h2 class="mt-2 text-2xl font-semibold">Выберите сотрудника</h2>
    <p class="mt-2 text-sm text-slate-500">Войдите, чтобы продолжить работу с таймером.</p>
    <div class="mt-6 grid gap-2">
      <button v-for="person in employees" :key="person.id" class="choice" :disabled="busy" @click="emit('login', person.id)">
        <span>{{ person.name }}</span><span class="text-xs text-slate-400">{{ person.is_admin ? 'Администратор' : 'Сотрудник' }} →</span>
      </button>
      <p v-if="!employees.length" class="text-sm text-slate-500">Список сотрудников пуст или недоступен.</p>
    </div>
  </section>
</template>
