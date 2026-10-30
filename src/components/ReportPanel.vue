<script setup lang="ts">
import type { Employee, Entry } from '../types'
import { formatDuration } from '../domain/report'
import EntryRow from './EntryRow.vue'
defineProps<{ employees: Employee[]; entries: Entry[]; ownId: string; admin: boolean; from: string; to: string; valid: boolean; busy: boolean; total: (id: string) => number }>()
const emit = defineEmits<{ 'update:from': [value: string]; 'update:to': [value: string]; update: [id: string, description: string, start: string, end: string]; remove: [id: string] }>()
</script>
<template>
  <section class="card"><p class="eyebrow">Обзор</p><h2 class="mt-2 text-2xl font-semibold">Отчёт за период</h2><p class="mt-1 text-xs text-slate-500">Часовой пояс: {{ Intl.DateTimeFormat().resolvedOptions().timeZone }}</p>
    <div class="mt-5 grid gap-3 sm:grid-cols-2"><label class="text-xs text-slate-500">С<input class="input mt-1 w-full" type="date" :value="from" @input="emit('update:from', ($event.target as HTMLInputElement).value)" /></label><label class="text-xs text-slate-500">По<input class="input mt-1 w-full" type="date" :value="to" @input="emit('update:to', ($event.target as HTMLInputElement).value)" /></label></div>
    <p v-if="!valid" class="mt-4 text-sm text-rose-700">Выберите корректный период: начало не может быть позже окончания.</p>
    <template v-else><div v-for="person in employees.filter(person => admin || person.id === ownId)" :key="person.id" class="mt-6"><div class="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 class="font-semibold">{{ person.name }}</h3><span class="text-sm font-semibold text-indigo-700">{{ formatDuration(total(person.id)) }}</span></div><ul><EntryRow v-for="entry in entries.filter(item => item.employee_id === person.id)" :key="entry.id" :entry="entry" :own="person.id === ownId" :busy="busy" @update="(id, description, start, end) => emit('update', id, description, start, end)" @remove="id => emit('remove', id)" /></ul><p v-if="!entries.some(item => item.employee_id === person.id)" class="border-t border-slate-100 pt-3 text-sm text-slate-400">Нет записей за этот период.</p></div></template>
  </section>
</template>
