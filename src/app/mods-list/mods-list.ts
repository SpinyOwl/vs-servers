import { Component, Input, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VsMod } from '../../services/servers.service';
import { ModChip } from '../mod-chip/mod-chip';

@Component({
  selector: 'app-mods-list',
  standalone: true,
  imports: [CommonModule, ModChip],
  templateUrl: './mods-list.html',
  styleUrl: './mods-list.scss',
})
export class ModsList {
  @Input() mods: VsMod[] | null | undefined;
  @ViewChildren(ModChip) private chips!: QueryList<ModChip>;

  sortedMods() {
    return (this.mods ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
  }

  onScroll() {
    this.chips?.forEach((chip) => chip.updateTooltipPosition());
  }
}
