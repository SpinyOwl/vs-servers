import {Component, inject, signal} from '@angular/core';
import {ServersService, VsMod} from '../../services/servers.service';
import {ServerList} from './server-list/server-list';
import {ModPane} from './mod-pane/mod-pane';

@Component({
  selector: 'app-servers',
  standalone: true,
  imports: [ServerList, ModPane],
  templateUrl: './servers.html',
  styleUrl: './servers.scss',
})
export class Servers {
  private readonly api = inject(ServersService);

  servers = this.api.servers;
  loading = this.api.loading;
  error = this.api.error;

  selectedMod = signal<VsMod | null>(null);

  reload(): void {
    this.api.reload();
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
