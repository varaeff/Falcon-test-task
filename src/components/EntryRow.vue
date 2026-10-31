<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Entry, Interval } from '../types';
import {
  formatCompactDuration,
  localDateTime,
  validateEntryInterval,
} from '../domain/report';
const props = defineProps<{
  entry: Entry;
  elapsed: number;
  own: boolean;
  busy: boolean;
  loadIntervals: () => Promise<Interval[] | null>;
  operation: string;
  now: number;
  update: (
    id: string,
    description: string,
    start: string,
    end: string
  ) => Promise<boolean>;
}>();
const emit = defineEmits<{
  remove: [id: string];
}>();
const editing = ref(false),
  description = ref(''),
  start = ref(''),
  end = ref('');
const intervals = ref<Interval[]>([]);
const loading = ref(false);
const validation = computed(() =>
  validateEntryInterval(start.value, end.value, props.entry, intervals.value, props.now)
);
async function edit() {
  loading.value = true;
  const result = await props.loadIntervals();
  loading.value = false;
  if (!result) return;
  intervals.value = result;
  description.value = props.entry.description;
  start.value = localDateTime(props.entry.started_at);
  end.value = localDateTime(props.entry.ended_at ?? props.entry.started_at);
  editing.value = true;
}
async function save() {
  if (
    props.busy ||
    validation.value.invalidStart ||
    validation.value.invalidEnd ||
    !description.value.trim()
  )
    return;
  if (
    await props.update(
      props.entry.id,
      description.value,
      new Date(start.value).toISOString(),
      new Date(end.value).toISOString()
    )
  )
    editing.value = false;
}
</script>

<template>
  <li class="border-t border-slate-100 py-4">
    <form v-if="editing" class="grid gap-2" @submit.prevent="save">
      <label class="text-xs text-slate-500"
        >Описание<input v-model="description" class="input mt-1 w-full" required
      /></label>
      <div class="grid gap-2 sm:grid-cols-2">
        <label
          >Начало<input
            v-model="start"
            type="datetime-local"
            step="1"
            class="input mt-1 w-full"
            :class="{
              'border-rose-600! ring-2! ring-rose-100!': validation.invalidStart,
            }"
            :aria-invalid="validation.invalidStart"
            required /></label
        ><label
          >Окончание<input
            v-model="end"
            type="datetime-local"
            step="1"
            class="input mt-1 w-full"
            :class="{
              'border-rose-600! ring-2! ring-rose-100!': validation.invalidEnd,
            }"
            :aria-invalid="validation.invalidEnd"
            required
        /></label>
      </div>
      <p
        v-if="validation.invalidStart || validation.invalidEnd"
        class="text-sm text-rose-700"
      >
        Проверьте границы: окончание должно быть позже начала, интервал не должен быть в
        будущем или пересекаться с другими записями.
      </p>
      <div class="flex gap-3">
        <button
          class="button"
          :disabled="
            busy ||
            validation.invalidStart ||
            validation.invalidEnd ||
            !description.trim()
          "
        >
          {{ operation === `update:${entry.id}` ? 'Сохранение…' : 'Сохранить' }}</button
        ><button type="button" :disabled="busy" @click="editing = false">Отмена</button>
      </div>
    </form>
    <template v-else
      ><div class="flex flex-wrap justify-between gap-2">
        <p class="font-medium">{{ entry.description }}</p>
        <span v-if="!entry.ended_at" class="status">Активен</span>
      </div>
      <div
        class="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"
      >
        <p class="text-slate-500">
          {{ new Date(entry.started_at).toLocaleString() }} —
          {{ entry.ended_at ? new Date(entry.ended_at).toLocaleString() : 'сейчас' }}
        </p>
        <p class="ml-auto whitespace-nowrap text-right text-slate-500">
          {{ formatCompactDuration(elapsed) }}
        </p>
      </div>
      <div v-if="own && entry.ended_at" class="mt-2 flex gap-4 text-xs font-semibold">
        <button class="text-indigo-700" :disabled="busy || loading" @click="edit">
          {{ loading ? 'Загрузка…' : 'Изменить' }}</button
        ><button class="text-rose-700" :disabled="busy" @click="emit('remove', entry.id)">
          {{ operation === `remove:${entry.id}` ? 'Удаление…' : 'Удалить' }}
        </button>
      </div></template
    >
  </li>
</template>
