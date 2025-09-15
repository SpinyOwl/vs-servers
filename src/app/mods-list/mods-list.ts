import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VsMod } from '../../services/servers.service';

@Component({
  selector: 'app-mods-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mods-list.html',
  styleUrl: './mods-list.scss',
})
export class ModsList {
  @Input() mods: VsMod[] | null | undefined;

  sortedMods() {
    return (this.mods ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
  }
}
