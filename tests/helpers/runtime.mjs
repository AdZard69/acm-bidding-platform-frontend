import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
export function loadSource(path, mocks = {}, globals = {}, suffix = '') {
  const source = readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8')
    .replaceAll('import.meta.env', '({})') + suffix;
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, require: (name) => name in mocks ? mocks[name] : require(name),
    URL, performance, ...globals
  }, { filename: path });
  return exports;
}

// A deterministic hook runner keeps socket delivery, REST completion and elapsed
// browser time independently controllable without a DOM or new dependencies.
export function hookRuntime() {
  const slots = [];
  const cleanups = new Map();
  const intervals = new Map();
  let index = 0;
  let effects = [];
  let dirty = true;
  let value;
  const changed = (previous, next) => !previous || !next || next.some((item, i) => !Object.is(item, previous[i]));
  const react = {
    createContext: () => ({}),
    useState(initial) {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
      return [slots[slot], (next) => {
        slots[slot] = typeof next === 'function' ? next(slots[slot]) : next;
        dirty = true;
      }];
    },
    useRef(initial) { const slot = index++; return slots[slot] ||= { current: initial }; },
    useCallback(callback, deps) {
      const slot = index++;
      if (changed(slots[slot]?.deps, deps)) slots[slot] = { deps, callback };
      return slots[slot].callback;
    },
    useEffect(effect, deps) {
      const slot = index++;
      if (changed(slots[slot], deps)) {
        slots[slot] = deps;
        effects.push(() => { cleanups.get(slot)?.(); cleanups.set(slot, effect()); });
      }
    }
  };
  return {
    react,
    globals: {
      window: { location: { origin: 'http://localhost' } },
      document: { addEventListener() {}, removeEventListener() {} },
      setInterval(callback, period) { const key = {}; intervals.set(key, { callback, period }); return key; },
      clearInterval(key) { intervals.delete(key); }
    },
    render(hook) {
      dirty = true;
      for (let attempts = 0; dirty; attempts++) {
        if (attempts > 20) throw new Error('Hook failed to settle');
        dirty = false;
        index = 0;
        value = hook();
        const pending = effects;
        effects = [];
        pending.forEach((effect) => effect());
      }
      return value;
    },
    tick(period) { for (const interval of intervals.values()) if (interval.period === period) interval.callback(); },
    cleanup() { for (const cleanup of cleanups.values()) cleanup?.(); }
  };
}

export const deferred = () => {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
};
export const flushPromises = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
