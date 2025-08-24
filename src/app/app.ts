import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServersService, VsServer } from '../services/servers.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly api = inject(ServersService);

  // raw and filtered data
  servers = signal<VsServer[]>([]);
  filterName = signal<string>('');
  filterVersion = signal<string>('');
  pageSize = signal<number>(20);
  page = signal<number>(1);

  filtered = computed(() => {
    const nameQ = this.filterName().trim().toLowerCase();
    const verQ  = this.filterVersion().trim().toLowerCase();
    return this.servers().filter(s => {
      const n = (s.serverName ?? '').toLowerCase();
      const v = (s.gameVersion ?? '').toLowerCase();
      return (!nameQ || n.includes(nameQ)) && (!verQ || v.includes(verQ));
    });
  });

  pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list$().subscribe({
      next: data => {
        this.servers.set(data);
        this.page.set(1);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(String(err?.message ?? err));
        this.loading.set(false);
      }
    });
  }

  setPageSize(val: string | number) {
    const n = Number(val) || 20;
    this.pageSize.set(n);
    this.page.set(1);
  }
  prev() { if (this.page() > 1) this.page.set(this.page() - 1); }
  next() { if (this.page() < this.pages()) this.page.set(this.page() + 1); }

  // safe util for templates
  modPreview(mods?: {id:string;version:string}[]) {
    const list = Array.isArray(mods) ? mods : [];
    const first = list.slice(0, 3).map(m => `${m.id} ${m.version}`).join(', ');
    const more = Math.max(0, list.length - 3);
    return first + (more ? `, +${more} more` : '') || '—';
  }
}
