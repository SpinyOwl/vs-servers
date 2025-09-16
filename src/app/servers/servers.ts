import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ServersService, VsMod, VsServer} from '../../services/servers.service';
import {ServerList} from './server-list/server-list';
import {ModPane} from './mod-pane/mod-pane';

@Component({
  selector: 'app-servers',
  standalone: true,
  imports: [CommonModule, ServerList, ModPane],
  templateUrl: './servers.html',
  styleUrl: './servers.scss',
})
export class Servers implements OnInit {
  private readonly api = inject(ServersService);

  servers = signal<VsServer[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  selectedMod = signal<VsMod | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list$().subscribe({
      next: (data) => {
        this.servers.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(String(err?.message ?? err));
        this.loading.set(false);
      },
    });
  }

  showMod(mod: VsMod) {
    const id = mod?.id?.trim();
    if (!id) {
      return;
    }

    this.selectedMod.set(mod);
  }

  closeSidebar() {
    this.selectedMod.set(null);
  }
}
