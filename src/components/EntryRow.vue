<script setup lang="ts">
import { ref } from 'vue'
import type { Entry } from '../types'
import { localDateTime } from '../domain/report'
const props = defineProps<{ entry: Entry; own: boolean; busy: boolean }>()
const emit = defineEmits<{ update: [id: string, description: string, start: string, end: string]; remove: [id: string] }>()
const editing = ref(false), description = ref(''), start = ref(''), end = ref('')
function edit() { description.value = props.entry.description; start.value = localDateTime(props.entry.started_at); end.value = localDateTime(props.entry.ended_at ?? props.entry.started_at); editing.value = true }
function save() { const from = new Date(start.value), to = new Date(end.value); if (Number.isFinite(from.getTime()) && Number.isFinite(to.getTime())) emit('update', props.entry.id, description.value, from.toISOString(), to.toISOString()) }
</script>
<template>
  <li class="border-t border-slate-100 py-4">
    <form v-if="editing" class="grid gap-2" @submit.prevent="save">
      <label class="text-xs text-slate-500">Описание<input v-model="description" class="input mt-1 w-full" required /></label>
      <div class="grid gap-2 sm:grid-cols-2"><label>Начало<input v-model="start" type="datetime-local" step="1" class="input mt-1 w-full" required /></label><label>Окончание<input v-model="end" type="datetime-local" step="1" class="input mt-1 w-full" required /></label></div>
      <div class="flex gap-3"><button class="button" :disabled="busy">Сохранить</button><button type="button" @click="editing = false">Отмена</button></div>
    </form>
    <template v-else><div class="flex flex-wrap justify-between gap-2"><p class="font-medium">{{ entry.description }}</p><span v-if="!entry.ended_at" class="status">Активен</span></div><p class="mt-1 text-sm text-slate-500">{{ new Date(entry.started_at).toLocaleString() }} — {{ entry.ended_at ? new Date(entry.ended_at).toLocaleString() : 'сейчас' }}</p><div v-if="own && entry.ended_at" class="mt-2 flex gap-4 text-xs font-semibold"><button class="text-indigo-700" :disabled="busy" @click="edit">Изменить</button><button class="text-rose-700" :disabled="busy" @click="emit('remove', entry.id)">Удалить</button></div></template>
  </li>
</template>
