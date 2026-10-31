import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createRenderer, createSSRApp, h, nextTick, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
});
const { api } = await server.ssrLoadModule('/src/api/tracking.ts');
const { useTrackingData } = await server.ssrLoadModule(
  '/src/composables/useTrackingData.ts'
);
const { useTracking } = await server.ssrLoadModule('/src/composables/useTracking.ts');
const { useReport } = await server.ssrLoadModule('/src/composables/useReport.ts');
const { default: ReportPanel } = await server.ssrLoadModule(
  '/src/components/ReportPanel.vue'
);
const renderer = createRenderer({
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText() {},
  setElementText() {},
  insert() {},
  remove() {},
  patchProp() {},
  parentNode: () => null,
  nextSibling: () => null,
});
const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test('refresh ignores stale responses and separates action success from refresh failure', async () => {
  const originals = { ...api };
  const session = ref({ employee: '1', token: 'token' });
  const range = ref([0, 10000]);
  let data;
  const first = deferred();
  let reportCalls = 0;
  api.employees = async () => [{ id: '1', name: 'A', is_admin: false }];
  api.session = async () => ({ id: '1', name: 'A', is_admin: false });
  api.active = async () => undefined;
  api.report = async () => (++reportCalls === 1 ? first.promise : [{ id: 'new' }]);
  const app = renderer.createApp({
    setup() {
      data = useTrackingData(
        session,
        () => {
          session.value = null;
        },
        range
      );
      return () => h('div');
    },
  });
  try {
    app.mount({});
    await flush();
    assert.equal(data.loading.value, true);
    await data.refresh();
    first.resolve([{ id: 'old' }]);
    await flush();
    assert.equal(data.entries.value[0].id, 'new');
    assert.equal(data.loading.value, false);

    api.report = async () => {
      throw new Error('offline');
    };
    let actions = 0;
    assert.equal(
      await data.run('update', async () => {
        actions++;
      }),
      true
    );
    assert.equal(actions, 1);
    assert.match(data.error.value, /Действие выполнено/);
    assert.equal(data.operation.value, '');

    assert.equal(
      await data.run('update', async () => {
        throw new Error('rejected');
      }),
      false
    );
    assert.equal(data.error.value, 'rejected');
    range.value = [10000, 20000];
    await nextTick();
  } finally {
    app.unmount();
    Object.assign(api, originals);
  }
});

test('stale session failures do not clear the current session', async () => {
  const originals = { ...api };
  const session = ref({ employee: '1', token: 'old' });
  const pending = deferred();
  api.employees = async () => [];
  api.session = () => pending.promise;
  api.report = async () => [];
  api.active = async () => undefined;
  let data;
  const app = renderer.createApp({
    setup() {
      data = useTrackingData(
        session,
        () => {
          session.value = null;
        },
        ref([0, 1000])
      );
      return () => h('div');
    },
  });
  try {
    app.mount({});
    await flush();
    session.value = { employee: '2', token: 'new' };
    pending.reject(new Error('SESSION_REVOKED'));
    await flush();
    assert.equal(session.value.token, 'new');
    assert.equal(data.error.value, '');
  } finally {
    app.unmount();
    Object.assign(api, originals);
  }
});

test('period changed during a failed action is loaded without hiding the action error', async () => {
  const originals = { ...api };
  const session = ref({ employee: '1', token: 'token' });
  const range = ref([0, 1000]);
  const action = deferred();
  const requested = [];
  api.employees = async () => [];
  api.session = async () => ({ id: '1', name: 'A', is_admin: false });
  api.report = async (_session, from, to) => {
    requested.push([from, to]);
    return [];
  };
  api.active = async () => undefined;
  let data;
  const app = renderer.createApp({
    setup() {
      data = useTrackingData(session, () => {}, range);
      return () => h('div');
    },
  });
  try {
    app.mount({});
    await flush();
    const result = data.run('update', () => action.promise);
    range.value = [2000, 3000];
    await nextTick();
    action.reject(new Error('save failed'));
    assert.equal(await result, false);
    assert.equal(data.error.value, 'save failed');
    assert.deepEqual(requested.at(-1), [
      new Date(2000).toISOString(),
      new Date(3000).toISOString(),
    ]);
  } finally {
    app.unmount();
    Object.assign(api, originals);
  }
});

test('a stopped timer can be started again, and a running timer cannot be duplicated', async () => {
  const originals = { ...api };
  const originalStorage = globalThis.sessionStorage;
  const session = { employee: '1', token: 'token' };
  globalThis.sessionStorage = {
    getItem: () => JSON.stringify(session),
    setItem() {},
    removeItem() {},
  };
  const person = { id: '1', name: 'Сотрудник', is_admin: false };
  const records = [];
  let running;
  api.employees = async () => [person];
  api.session = async () => person;
  api.report = async () => records;
  api.active = async () => running;
  api.start = async (_session, description) => {
    if (running) throw new Error('Таймер уже запущен');
    running = {
      id: String(records.length + 1),
      employee_id: '1',
      description,
      started_at: new Date().toISOString(),
      ended_at: null,
    };
    records.push(running);
  };
  api.stop = async () => {
    running.ended_at = new Date().toISOString();
    running = undefined;
  };
  let tracking;
  const app = renderer.createApp({
    setup() {
      tracking = useTracking();
      return () => h('div');
    },
  });
  try {
    app.mount({});
    await flush();
    assert.equal(await tracking.start('Первая задача'), true);
    assert.equal(tracking.active.value.description, 'Первая задача');
    assert.equal(await tracking.start('Дубликат'), false);
    assert.equal(records.length, 1);
    assert.match(tracking.error.value, /Таймер уже запущен/);
    assert.equal(await tracking.stop(), true);
    assert.equal(tracking.active.value, undefined);
    assert.equal(await tracking.start('Вторая задача'), true);
    assert.equal(tracking.active.value.description, 'Вторая задача');
    assert.equal(records.length, 2);
    assert.ok(records[0].ended_at);
    assert.equal(records[1].ended_at, null);
  } finally {
    app.unmount();
    Object.assign(api, originals);
    if (originalStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = originalStorage;
  }
});

test('an empty report shows zero duration and the empty-period message', async () => {
  const person = { id: '1', name: 'Сотрудник', is_admin: false };
  let report;
  const holder = renderer.createApp({
    setup() {
      report = useReport(ref([]), ref([person]), ref([0, 1000]));
      return () => h('div');
    },
  });
  try {
    holder.mount({});
    assert.deepEqual(report.groups.value, [{ person, entries: [], total: 0 }]);
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(ReportPanel, {
            groups: report.groups.value,
            now: Date.now(),
            ownId: person.id,
            admin: false,
            from: '2024-01-01',
            to: '2024-01-07',
            valid: true,
            busy: false,
            operation: '',
            refreshing: false,
            update: async () => true,
            loadIntervals: async () => [],
          }),
      })
    );
    assert.match(html, /Нет записей за этот период/);
    assert.match(html, /0 ч 00 мин 00 с/);
    assert.match(html, /Сотрудник/);
  } finally {
    holder.unmount();
  }
});

test.after(async () => {
  await server.close();
});
