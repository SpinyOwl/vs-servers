import {ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ModsList} from '../mods-list/mods-list';
import {ModFilter} from './mod-filter/mod-filter';
import {ServerDetails} from '../server-details/server-details';
import {VsMod, VsServer} from '../../../services/servers.service';
import {ActivatedRoute, ParamMap, Params, Router, convertToParamMap} from '@angular/router';
import {takeUntilDestroyed, toObservable} from '@angular/core/rxjs-interop';
import {debounceTime, distinctUntilChanged} from 'rxjs';

import {
  ServerFilterCriteria,
  compareVersions,
  indexServer,
  loadStoredFilters,
  matchesServer,
  saveStoredFilters,
} from './server-filters';

const collator = new Intl.Collator();

const FILTER_PARAM_KEYS = [
  'name', 'version', 'mod', 'excludeMod', 'hasPassword', 'whitelisted', 'freeSlots', 'online', 'modded',
];

export interface ActiveFilter {
  id: string;
  label: string;
  remove: () => void;
}

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

@Component({
  selector: 'app-server-list',
  standalone: true,
  imports: [FormsModule, ModsList, ModFilter, ServerDetails],
  templateUrl: './server-list.html',
  styleUrl: './server-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerList {
  servers = input<VsServer[]>([]);
  modSelected = output<VsMod>();

  private readonly route = inject(ActivatedRoute, {optional: true});
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router, {optional: true});

  filterName = signal<string>('');
  filterVersion = signal<string>('');
  filterMods = signal<string[]>([]);
  filterExcludeMods = signal<string[]>([]);
  filterFreeSlots = signal<boolean>(false);
  filterOnline = signal<boolean>(false);
  // '' = any, 'true' = with mods, 'false' = vanilla only
  filterModded = signal<string>('');
  filterHasPassword = signal<string>('');
  filterWhitelisted = signal<string>('');
  pageSize = signal<number>(20);
  page = signal<number>(1);
  // Default order (no `sort` in the URL): most players first.
  sortColumn = signal<string>('players');
  sortAsc = signal<boolean>(false);

  // Debounced copy of the name filter: typing stays instant, filtering/URL sync run after a pause.
  private readonly debouncedName = signal<string>('');

  versions = computed(() => {
    const list = this.servers()
      .map((s) => s.gameVersion)
      .filter((v): v is string => !!v);
    return Array.from(new Set(list)).sort((a, b) => compareVersions(b, a));
  });

  // Lower-cased lookup data is computed once per server list, not once per filter change.
  private indexed = computed(() => this.servers().map(indexServer));

  private normalizedMods(list: string[]): string[] {
    return list.map((value) => value.trim().toLowerCase()).filter((value) => value.length > 0);
  }

  filtered = computed(() => {
    const criteria: ServerFilterCriteria = {
      name: this.debouncedName().trim().toLowerCase(),
      version: this.filterVersion().trim(),
      mods: this.normalizedMods(this.filterMods()),
      excludeMods: this.normalizedMods(this.filterExcludeMods()),
      hasPassword: this.filterHasPassword().trim(),
      whitelisted: this.filterWhitelisted().trim(),
      modded: this.filterModded(),
      freeSlots: this.filterFreeSlots(),
      online: this.filterOnline(),
    };
    return this.indexed()
      .filter((entry) => matchesServer(entry, criteria))
      .map(({server}) => server);
  });

  activeFilters = computed<ActiveFilter[]>(() => {
    const result: ActiveFilter[] = [];
    const add = (id: string, label: string, remove: () => void) => result.push({id, label, remove});
    const name = this.filterName().trim();
    if (name) add('name', `Name: ${name}`, () => this.clearName());
    if (this.filterVersion()) add('version', `Version: ${this.filterVersion()}`, () => this.filterVersion.set(''));
    for (const m of this.filterMods()) {
      add('mod:' + m, `Mod: ${m}`, () => this.filterMods.update((l) => l.filter((x) => x !== m)));
    }
    for (const m of this.filterExcludeMods()) {
      add('exclude:' + m, `Without mod: ${m}`, () => this.filterExcludeMods.update((l) => l.filter((x) => x !== m)));
    }
    if (this.filterModded()) {
      add('modded', this.filterModded() === 'true' ? 'With mods' : 'Vanilla only', () => this.filterModded.set(''));
    }
    if (this.filterHasPassword()) {
      add('pw', this.filterHasPassword() === 'true' ? 'Has password' : 'No password', () => this.filterHasPassword.set(''));
    }
    if (this.filterWhitelisted()) {
      add('wl', this.filterWhitelisted() === 'true' ? 'Whitelisted' : 'Not whitelisted', () => this.filterWhitelisted.set(''));
    }
    if (this.filterFreeSlots()) add('free', 'Free slots', () => this.filterFreeSlots.set(false));
    if (this.filterOnline()) add('online', 'Online now', () => this.filterOnline.set(false));
    return result;
  });

  sorted = computed(() => {
    const col = this.sortColumn();
    const asc = this.sortAsc();
    const list = this.filtered().slice();
    if (col) {
      list.sort((a, b) => {
        switch (col) {
          case 'serverName':
            return collator.compare(a.serverName || '', b.serverName || '');
          case 'gameDescription':
            return collator.compare(a.gameDescription || '', b.gameDescription || '');
          case 'mods':
            return (a.mods?.length || 0) - (b.mods?.length || 0);
          case 'players':
            return (a.players || 0) - (b.players || 0);
          case 'gameVersion':
            return compareVersions(a.gameVersion || '', b.gameVersion || '');
          default:
            return 0;
        }
      });
      if (!asc) list.reverse();
    }
    return list;
  });

  pages = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.pageSize())));
  // The requested page clamped to the available range (no effect needed to correct it).
  currentPage = computed(() => Math.min(this.page(), this.pages()));
  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });

  constructor() {
    if (this.route) {
      this.applyQueryParams(this.route.snapshot.queryParamMap);

      this.route.queryParamMap
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((params) => this.applyQueryParams(params));

      // Nothing filter-related in the URL: fall back to the filters used last time.
      const urlParams = this.route.snapshot.queryParamMap;
      if (!FILTER_PARAM_KEYS.some((key) => urlParams.has(key))) {
        const stored = loadStoredFilters(getStorage());
        if (FILTER_PARAM_KEYS.some((key) => key in stored)) {
          this.applyQueryParams(convertToParamMap({...stored, ...this.sortQueryParams(urlParams)}));
        }
      }
    }

    this.debouncedName.set(this.filterName());
    toObservable(this.filterName)
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.debouncedName.set(value));

    let lastSaved: string | null = null;
    effect(() => {
      if (!this.route || !this.router) {
        return;
      }

      const currentParams = this.route.snapshot.queryParams;
      const nextParams: Params = {...currentParams};

      this.writeStringParam(nextParams, 'name', this.debouncedName());
      this.writeStringParam(nextParams, 'version', this.filterVersion());
      this.writeStringArrayParam(nextParams, 'mod', this.filterMods());
      this.writeBooleanParam(nextParams, 'hasPassword', this.filterHasPassword());
      this.writeBooleanParam(nextParams, 'whitelisted', this.filterWhitelisted());
      this.writeStringArrayParam(nextParams, 'excludeMod', this.filterExcludeMods());
      this.writeBooleanParam(nextParams, 'freeSlots', this.filterFreeSlots() ? 'true' : '');
      this.writeBooleanParam(nextParams, 'online', this.filterOnline() ? 'true' : '');
      this.writeBooleanParam(nextParams, 'modded', this.filterModded());
      this.writeNumberParam(nextParams, 'pageSize', this.pageSize(), 20);
      this.writeNumberParam(nextParams, 'page', this.currentPage(), 1);
      this.writeSortParams(nextParams, this.sortColumn(), this.sortAsc());

      const stored: Record<string, string | string[]> = {};
      for (const key of FILTER_PARAM_KEYS) {
        if (nextParams[key] !== undefined) stored[key] = nextParams[key];
      }
      // Only touch localStorage when the filters themselves changed (not on paging/sorting).
      const serialized = JSON.stringify(stored);
      if (serialized !== lastSaved) {
        lastSaved = serialized;
        saveStoredFilters(getStorage(), stored);
      }

      if (this.queryParamsChanged(currentParams, nextParams)) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: nextParams,
          replaceUrl: true,
        });
      }
    });
  }

  setPageSize(val: string | number) {
    const n = Number(val) || 20;
    this.pageSize.set(n);
    this.page.set(1);
  }

  onFilterModsChange(mods: string[]) {
    this.filterMods.set(mods);
    this.page.set(1);
  }

  onFilterExcludeModsChange(mods: string[]) {
    this.filterExcludeMods.set(mods);
    this.page.set(1);
  }

  // Programmatic clears skip the typing debounce so the list and URL update at once.
  private clearName() {
    this.filterName.set('');
    this.debouncedName.set('');
  }

  resetFilters() {
    this.clearName();
    this.filterVersion.set('');
    this.filterMods.set([]);
    this.filterExcludeMods.set([]);
    this.filterHasPassword.set('');
    this.filterWhitelisted.set('');
    this.filterModded.set('');
    this.filterFreeSlots.set(false);
    this.filterOnline.set(false);
    this.page.set(1);
  }

  removeFilter(filter: ActiveFilter) {
    filter.remove();
    this.page.set(1);
  }

  prev() {
    if (this.currentPage() > 1) this.page.set(this.currentPage() - 1);
  }

  next() {
    if (this.currentPage() < this.pages()) this.page.set(this.currentPage() + 1);
  }

  sortBy(col: string) {
    if (this.sortColumn() === col) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortColumn.set(col);
      this.sortAsc.set(true);
    }
  }

  private applyQueryParams(params: ParamMap) {
    let touched = false;

    const name = params.get('name');
    // Ignore the (stale) URL value while a debounced edit of the name input is still pending.
    const namePending = this.debouncedName() !== this.filterName();
    if (name !== null && !namePending && this.filterName() !== name) {
      this.filterName.set(name);
      touched = true;
    }

    // A filter missing from the URL means "not set", so back/forward navigation clears it too.
    const version = params.get('version') ?? '';
    if (this.filterVersion() !== version) {
      this.filterVersion.set(version);
      touched = true;
    }

    const mods = this.normalizeModParams(params.getAll('mod'));
    if (!this.arraysEqual(this.filterMods(), mods)) {
      this.filterMods.set(mods);
      touched = true;
    }

    const excludeMods = this.normalizeModParams(params.getAll('excludeMod'));
    if (!this.arraysEqual(this.filterExcludeMods(), excludeMods)) {
      this.filterExcludeMods.set(excludeMods);
      touched = true;
    }

    const freeSlots = this.normalizeBooleanParam(params.get('freeSlots')) === 'true';
    if (this.filterFreeSlots() !== freeSlots) {
      this.filterFreeSlots.set(freeSlots);
      touched = true;
    }

    const online = this.normalizeBooleanParam(params.get('online')) === 'true';
    if (this.filterOnline() !== online) {
      this.filterOnline.set(online);
      touched = true;
    }

    const modded = this.normalizeBooleanParam(params.get('modded')) ?? '';
    if (this.filterModded() !== modded) {
      this.filterModded.set(modded);
      touched = true;
    }

    const hasPassword = this.normalizeBooleanParam(params.get('hasPassword')) ?? '';
    if (this.filterHasPassword() !== hasPassword) {
      this.filterHasPassword.set(hasPassword);
      touched = true;
    }

    const whitelisted = this.normalizeBooleanParam(params.get('whitelisted')) ?? '';
    if (this.filterWhitelisted() !== whitelisted) {
      this.filterWhitelisted.set(whitelisted);
      touched = true;
    }

    const pageSize = params.get('pageSize');
    if (pageSize !== null) {
      const parsed = Number(pageSize);
      if (!Number.isNaN(parsed) && parsed > 0 && this.pageSize() !== parsed) {
        this.pageSize.set(parsed);
        touched = true;
      }
    }

    const page = params.get('page');
    if (page !== null) {
      const parsed = Number(page);
      if (!Number.isNaN(parsed) && parsed > 0) {
        const normalized = Math.floor(parsed);
        if (this.page() !== normalized) {
          this.page.set(normalized);
        }
      } else if (this.page() !== 1) {
        this.page.set(1);
      }
    } else if (this.page() !== 1) {
      this.page.set(1);
    }

    const sort = params.get('sort');
    const dir = params.get('dir');
    // No `sort` means the default order (players, descending).
    const nextColumn = sort !== null ? sort : 'players';
    const nextAsc = sort !== null ? dir?.trim().toLowerCase() !== 'desc' : false;
    if (this.sortColumn() !== nextColumn) this.sortColumn.set(nextColumn);
    if (this.sortAsc() !== nextAsc) this.sortAsc.set(nextAsc);

    if (touched) {
      this.page.set(1);
    }
  }

  private normalizeBooleanParam(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === '') {
      return '';
    }

    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return 'true';
    }

    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return 'false';
    }

    if (['all', 'any'].includes(normalized)) {
      return '';
    }

    return null;
  }

  private writeStringParam(params: Params, key: string, value: string) {
    const trimmed = value.trim();
    if (trimmed) {
      params[key] = trimmed;
    } else {
      delete params[key];
    }
  }

  private writeBooleanParam(params: Params, key: string, value: string) {
    if (value === 'true' || value === 'false') {
      params[key] = value;
    } else {
      delete params[key];
    }
  }

  private writeStringArrayParam(params: Params, key: string, values: string[]) {
    const normalized = values
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (!normalized.length) {
      delete params[key];
      return;
    }

    if (normalized.length === 1) {
      params[key] = normalized[0];
      return;
    }

    params[key] = normalized;
  }

  private writeNumberParam(params: Params, key: string, value: number, defaultValue: number) {
    if (!Number.isFinite(value)) {
      delete params[key];
      return;
    }

    if (value === defaultValue) {
      delete params[key];
    } else {
      params[key] = String(Math.floor(value));
    }
  }

  private sortQueryParams(params: ParamMap): Params {
    const result: Params = {};
    for (const key of ['sort', 'dir']) {
      const value = params.get(key);
      if (value !== null) result[key] = value;
    }
    return result;
  }

  private writeSortParams(params: Params, column: string, asc: boolean) {
    const trimmed = column.trim();
    if (!trimmed || (trimmed === 'players' && !asc)) {
      delete params['sort'];
      delete params['dir'];
      return;
    }

    params['sort'] = trimmed;
    if (asc) {
      delete params['dir'];
    } else {
      params['dir'] = 'desc';
    }
  }

  private queryParamsChanged(current: Params, next: Params): boolean {
    const currentKeys = Object.keys(current).sort();
    const nextKeys = Object.keys(next).sort();
    if (currentKeys.length !== nextKeys.length) {
      return true;
    }

    for (let i = 0; i < currentKeys.length; i++) {
      const key = currentKeys[i];
      if (key !== nextKeys[i]) {
        return true;
      }

      const currentValue = current[key];
      const nextValue = next[key];
      if (Array.isArray(currentValue) || Array.isArray(nextValue)) {
        const currentArr = Array.isArray(currentValue) ? currentValue : [currentValue];
        const nextArr = Array.isArray(nextValue) ? nextValue : [nextValue];
        if (currentArr.length !== nextArr.length) {
          return true;
        }
        for (let j = 0; j < currentArr.length; j++) {
          if (currentArr[j] !== nextArr[j]) {
            return true;
          }
        }
      } else if (currentValue !== nextValue) {
        return true;
      }
    }

    return false;
  }

  private normalizeModParams(values: string[]): string[] {
    const result: string[] = [];
    for (const value of values) {
      if (typeof value !== 'string') {
        continue;
      }
      const parts = value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      result.push(...parts);
    }
    return result;
  }

  private arraysEqual(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }
}
