<script setup lang="ts">
import { computed } from 'vue';
import type { Employee } from '../types';
const props = defineProps<{
  employees: Employee[];
  busy: boolean;
  operation: string;
  name: string;
}>();
const emit = defineEmits<{
  add: [name: string];
  role: [id: string, admin: boolean];
  'update:name': [name: string];
}>();
const adminCount = computed(
  () => props.employees.filter((person) => person.is_admin).length
);
</script>

<template>
  <section class="card">
    <p class="eyebrow">Управление</p>
    <h2 class="mt-2 text-xl font-semibold">Команда</h2>
    <form
      class="mt-4 flex flex-col gap-2 sm:flex-row"
      @submit.prevent="emit('add', name)"
    >
      <input
        :value="name"
        class="input flex-1"
        required
        :disabled="busy"
        placeholder="Имя сотрудника"
        aria-label="Имя сотрудника"
        @input="emit('update:name', ($event.target as HTMLInputElement).value)"
      />
      <button class="button" :disabled="busy || !name.trim()">
        {{ operation === 'add' ? 'Добавление…' : 'Добавить' }}
      </button>
    </form>
    <ul class="mt-4 divide-y divide-slate-100">
      <li
        v-for="person in employees"
        :key="person.id"
        class="flex items-center justify-between gap-3 py-3 text-sm"
      >
        <span
          >{{ person.name }}
          <span v-if="person.is_admin" class="text-slate-400">· администратор</span></span
        >
        <button
          class="text-right text-xs font-semibold text-indigo-700"
          :disabled="busy || (person.is_admin && adminCount <= 1)"
          :title="
            person.is_admin && adminCount <= 1
              ? 'Нельзя снять роль с последнего администратора'
              : undefined
          "
          @click="emit('role', person.id, !person.is_admin)"
        >
          {{
            operation === `role:${person.id}`
              ? 'Сохранение…'
              : person.is_admin
                ? 'Снять роль'
                : 'Назначить администратором'
          }}
        </button>
      </li>
    </ul>
  </section>
</template>
