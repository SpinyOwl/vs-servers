import { Component, HostListener, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VsMod } from '../../services/servers.service';
import { ModsService, VsModInfo } from '../../services/mods.service';

@Component({
  selector: 'app-mods-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mods-list.html',
  styleUrl: './mods-list.scss',
})
export class ModsList {
  @Input() mods: VsMod[] | null | undefined;

  private readonly modsService = inject(ModsService);
  private readonly infoMap = new Map<string, VsModInfo>();
  private hoveredChip?: HTMLElement;

  sortedMods() {
    return (this.mods ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
  }

  loadModInfo(modid: string) {
    if (!this.infoMap.has(modid)) {
      this.modsService.get$(modid).subscribe((info) => {
        this.infoMap.set(modid, info);
      });
    }
  }

  onChipEnter(event: MouseEvent) {
    this.hoveredChip = event.currentTarget as HTMLElement;
    this.updateTooltipPosition();
  }

  onChipLeave() {
    this.hoveredChip = undefined;
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.updateTooltipPosition();
  }

  updateTooltipPosition() {
    if (!this.hoveredChip) return;
    const tooltip = this.hoveredChip.querySelector<HTMLElement>('.mod-tooltip');
    if (!tooltip) return;
    const rect = this.hoveredChip.getBoundingClientRect();
    tooltip.style.left = rect.left + 'px';
    tooltip.style.top = rect.top + 'px';
  }

  getInfo(modid: string) {
    return this.infoMap.get(modid);
  }

  modUrl(modid: string) {
    return `https://mods.vintagestory.at/show/mod/${modid}`;
  }

  logoUrl(info: VsModInfo): string | undefined {
    return info['logofile'];
  }
}
