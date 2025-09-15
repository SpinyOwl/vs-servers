import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ServersService, VsMod, VsServer} from '../../services/servers.service';
import {ModsList} from '../mods-list/mods-list';
import {ModsService, VsModInfo} from '../../services/mods.service';

@Component({
  selector: 'app-servers',
  standalone: true,
  imports: [CommonModule, FormsModule, ModsList, NgOptimizedImage],
  templateUrl: './servers.html',
  styleUrl: './servers.scss',
})
export class Servers implements OnInit {
  private readonly api = inject(ServersService);
  private readonly mods = inject(ModsService);

  // raw and filtered data
  servers = signal<VsServer[]>([]);
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

  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // sidebar state
  selectedMod = signal<VsMod | null>(null);
  selectedModId = signal<string | null>(null);
  selectedModInfo = signal<VsModInfo | null>(null);
  modLoading = signal<boolean>(false);
  modError = signal<string | null>(null);

  modLink = computed(() => {
    const info = this.selectedModInfo();
    const assetId = info?.assetid;
    if (!assetId) return null;
    return `https://mods.vintagestory.at/show/mod/${assetId}`;
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list$().subscribe({
      next: (data) => {
        this.servers.set(data);
        this.page.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(String(err?.message ?? err));
        this.loading.set(false);
      },
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

  showMod(mod: VsMod) {
    const id = mod?.id?.trim();
    if (!id) {
      return;
    }

    this.selectedMod.set(mod);

    if (this.selectedModId() === id && this.selectedModInfo()) {
      this.modLoading.set(false);
      this.modError.set(null);
      return;
    }

    this.selectedModId.set(id);
    this.selectedModInfo.set(null);
    this.modLoading.set(true);
    this.modError.set(null);

    this.mods.get$(id).subscribe({
      next: (info) => {
        if (this.selectedModId() !== id) return;
        this.selectedModInfo.set(info);
        this.modLoading.set(false);
      },
      error: (err) => {
        if (this.selectedModId() !== id) return;
        this.modError.set(String(err?.message ?? err ?? 'Failed to load mod information.'));
        this.modLoading.set(false);
      },
    });
  }

  closeSidebar() {
    this.selectedMod.set(null);
    this.selectedModId.set(null);
    this.selectedModInfo.set(null);
    this.modLoading.set(false);
    this.modError.set(null);
  }

}

