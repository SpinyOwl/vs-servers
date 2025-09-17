import {Component, DestroyRef, computed, effect, inject, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ModsList} from '../mods-list/mods-list';
import {VsMod, VsServer} from '../../../services/servers.service';
import {ActivatedRoute, ParamMap, Params, Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-server-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ModsList],
  templateUrl: './server-list.html',
  styleUrl: './server-list.scss',
})
export class ServerList {
  servers = input<VsServer[]>([]);
  modSelected = output<VsMod>();

  private readonly route = inject(ActivatedRoute, {optional: true});
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router, {optional: true});

  filterName = signal<string>('');
  filterVersion = signal<string>('');
  filterMod = signal<string>('');
  filterHasPassword = signal<string>('');
  filterWhitelisted = signal<string>('');
  pageSize = signal<number>(20);
  page = signal<number>(1);
  sortColumn = signal<string>('');
  sortAsc = signal<boolean>(true);

  versions = computed(() => {
    const list = this.servers()
      .map((s) => s.gameVersion)
      .filter((v): v is string => !!v);
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b)).reverse();
  });

  filtered = computed(() => {
    const nameQ = this.filterName().trim().toLowerCase();
    const ver = this.filterVersion().trim();
    const mod = this.filterMod().trim().toLowerCase();
    const hasPw = this.filterHasPassword().trim();
    const wl = this.filterWhitelisted().trim();
    return this.servers().filter((s) => {
      const n = (s.serverName ?? '').toLowerCase();
      const modMatch = s.mods?.some((m) => m.id.toLowerCase().includes(mod)) ?? false;
      const pwMatch = !hasPw || String(s.hasPassword ?? false) === hasPw;
      const wlMatch = !wl || String(s.whitelisted ?? false) === wl;
      return (
        (!nameQ || n.includes(nameQ)) &&
        (!ver || s.gameVersion === ver) &&
        (!mod || modMatch) &&
        pwMatch &&
        wlMatch
      );
    });
  });

  sorted = computed(() => {
    const col = this.sortColumn();
    const asc = this.sortAsc();
    const list = this.filtered().slice();
    if (col) {
      list.sort((a, b) => {
        let av: any;
        let bv: any;
        switch (col) {
          case 'serverName':
            av = a.serverName || '';
            bv = b.serverName || '';
            return av.localeCompare(bv);
          case 'gameDescription':
            av = a.gameDescription || '';
            bv = b.gameDescription || '';
            return av.localeCompare(bv);
          case 'mods':
            av = a.mods?.length || 0;
            bv = b.mods?.length || 0;
            return av - bv;
          case 'players':
            av = a.players || 0;
            bv = b.players || 0;
            return av - bv;
          case 'gameVersion':
            av = a.gameVersion || '';
            bv = b.gameVersion || '';
            return av.localeCompare(bv);
          default:
            return 0;
        }
      });
      if (!asc) list.reverse();
    }
    return list;
  });

  pages = computed(() => Math.max(1, Math.ceil(this.sorted().length / this.pageSize())));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });

  constructor() {
    if (this.route) {
      this.applyQueryParams(this.route.snapshot.queryParamMap);

      this.route.queryParamMap
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((params) => this.applyQueryParams(params));
    }

    effect(() => {
      this.servers();
      this.page.set(1);
    });

    effect(() => {
      const maxPages = this.pages();
      const current = this.page();
      if (current > maxPages) {
        this.page.set(maxPages);
      }
    });

    effect(() => {
      if (!this.route || !this.router) {
        return;
      }

      const currentParams = this.route.snapshot.queryParams;
      const nextParams: Params = {...currentParams};

      this.writeStringParam(nextParams, 'name', this.filterName());
      this.writeStringParam(nextParams, 'version', this.filterVersion());
      this.writeStringParam(nextParams, 'mod', this.filterMod());
      this.writeBooleanParam(nextParams, 'hasPassword', this.filterHasPassword());
      this.writeBooleanParam(nextParams, 'whitelisted', this.filterWhitelisted());
      this.writeNumberParam(nextParams, 'pageSize', this.pageSize(), 20);
      this.writeNumberParam(nextParams, 'page', this.page(), 1);
      this.writeSortParams(nextParams, this.sortColumn(), this.sortAsc());

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

  prev() {
    if (this.page() > 1) this.page.set(this.page() - 1);
  }

  next() {
    if (this.page() < this.pages()) this.page.set(this.page() + 1);
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
    if (name !== null && this.filterName() !== name) {
      this.filterName.set(name);
      touched = true;
    }

    const version = params.get('version');
    if (version !== null && this.filterVersion() !== version) {
      this.filterVersion.set(version);
      touched = true;
    }

    const mod = params.get('mod');
    if (mod !== null && this.filterMod() !== mod) {
      this.filterMod.set(mod);
      touched = true;
    }

    const hasPassword = this.normalizeBooleanParam(params.get('hasPassword'));
    if (hasPassword !== null && this.filterHasPassword() !== hasPassword) {
      this.filterHasPassword.set(hasPassword);
      touched = true;
    }

    const whitelisted = this.normalizeBooleanParam(params.get('whitelisted'));
    if (whitelisted !== null && this.filterWhitelisted() !== whitelisted) {
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
    if (sort !== null) {
      if (this.sortColumn() !== sort) {
        this.sortColumn.set(sort);
      }
    } else if (this.sortColumn()) {
      this.sortColumn.set('');
    }

    const dir = params.get('dir');
    if (dir !== null) {
      const normalized = dir.trim().toLowerCase();
      const asc = normalized !== 'desc';
      if (this.sortAsc() !== asc) {
        this.sortAsc.set(asc);
      }
    } else if (!this.sortAsc()) {
      this.sortAsc.set(true);
    }

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

  private writeSortParams(params: Params, column: string, asc: boolean) {
    const trimmed = column.trim();
    if (!trimmed) {
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
}
