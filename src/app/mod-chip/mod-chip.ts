import { Component, ElementRef, HostListener, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VsMod } from '../../services/servers.service';
import { ModsService, VsModInfo } from '../../services/mods.service';

@Component({
  selector: 'app-mod-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mod-chip.html',
  styleUrl: './mod-chip.scss',
})
export class ModChip {
  @Input({ required: true }) mod!: VsMod;

  private readonly modsService = inject(ModsService);
  private readonly host = inject(ElementRef<HTMLElement>);

  info?: VsModInfo;
  private requested = false;
  private hovered = false;

  onMouseEnter() {
    this.hovered = true;
    this.updateTooltipPosition();
    this.loadModInfo();
  }

  onMouseLeave() {
    this.hovered = false;
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.updateTooltipPosition();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updateTooltipPosition();
  }

  updateTooltipPosition() {
    if (!this.hovered) return;
    const hostElement = this.host.nativeElement;
    const anchor = hostElement.querySelector('a.mod-chip') as HTMLElement | null;
    const tooltip = hostElement.querySelector('.mod-tooltip') as HTMLElement | null;
    if (!anchor || !tooltip) return;
    const rect = anchor.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.top}px`;
  }

  modUrl() {
    const assetId = this.info?.assetId;
    if (assetId != null) {
      return `https://mods.vintagestory.at/show/mod/${assetId}`;
    }
    return '#';
  }

  logoUrl(info: VsModInfo): string | undefined {
    return info['logofile'];
  }

  private loadModInfo() {
    if (this.requested) return;
    const id = this.mod?.id;
    if (!id) return;
    this.requested = true;
    this.modsService.get$(id).subscribe({
      next: (info) => {
        this.info = info;
        this.updateTooltipPosition();
      },
      error: (err) => {
        console.error(`Failed to load mod info for ${id}`, err);
        this.requested = false;
      },
    });
  }
}
