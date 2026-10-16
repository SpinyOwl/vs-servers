import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {Subscription} from 'rxjs';

import {VsMod} from '../../../../services/servers.service';
import {ModsService, VsModShortInfo} from '../../../../services/mods.service';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-mod-chip',
  standalone: true,
  templateUrl: './mod-chip.html',
  styleUrl: './mod-chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModChip {
  mod = input.required<VsMod>();

  view = output<VsMod>();

  private readonly modsService = inject(ModsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly chipButton = viewChild<ElementRef<HTMLButtonElement>>('chipButton');
  private readonly tooltipElement = viewChild<ElementRef<HTMLDivElement>>('tooltipElement');

  readonly tooltipVisible = signal(false);
  readonly tooltipPosition = signal<TooltipPosition | undefined>(undefined);
  readonly tooltipId = `mod-chip-tooltip-${Math.random().toString(36).slice(2)}`;

  private readonly info = signal<VsModShortInfo | undefined>(undefined);
  readonly tooltip = computed(() => this.buildTooltip(this.mod(), this.info()));
  readonly ariaLabel = computed(() => {
    const mod = this.mod();
    return mod.version ? `${mod.id} v${mod.version}` : mod.id;
  });

  private infoSub?: Subscription;
  private infoLoadedFor?: string;
  private measurementTimerId?: number;
  private viewportListening = false;

  private readonly onViewportChange = () => this.updateTooltipPosition();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.infoSub?.unsubscribe();
      this.cancelScheduledMeasurement();
      this.stopViewportListening();
    });
  }

  onClick() {
    this.view.emit(this.mod());
    this.hideTooltip();
  }

  onPointerEnter() {
    this.showTooltip();
  }

  onPointerLeave() {
    this.hideTooltip();
  }

  onFocus() {
    this.showTooltip();
  }

  private showTooltip() {
    this.tooltipVisible.set(true);
    this.tooltipPosition.set(undefined);
    this.loadInfo();
    this.startViewportListening();
    this.scheduleTooltipMeasurement();
  }

  private hideTooltip() {
    this.tooltipVisible.set(false);
    this.tooltipPosition.set(undefined);
    this.cancelScheduledMeasurement();
    this.stopViewportListening();
  }

  // Mod details are only resolved once a tooltip is actually requested.
  private loadInfo() {
    const id = this.mod().id;
    if (this.infoLoadedFor === id) {
      return;
    }

    this.infoLoadedFor = id;
    this.infoSub?.unsubscribe();
    this.infoSub = this.modsService.shortInfo$(id).subscribe(info => {
      this.info.set(info);
      this.scheduleTooltipMeasurement();
    });
  }

  private startViewportListening() {
    if (this.viewportListening || typeof window === 'undefined') {
      return;
    }

    this.viewportListening = true;
    window.addEventListener('resize', this.onViewportChange, {passive: true});
    window.addEventListener('scroll', this.onViewportChange, {passive: true, capture: true});
  }

  private stopViewportListening() {
    if (!this.viewportListening || typeof window === 'undefined') {
      return;
    }

    this.viewportListening = false;
    window.removeEventListener('resize', this.onViewportChange);
    window.removeEventListener('scroll', this.onViewportChange, {capture: true});
  }

  private updateTooltipPosition() {
    if (!this.tooltipVisible()) {
      return;
    }

    const position = this.calculateTooltipPosition();
    if (!position) {
      this.scheduleTooltipMeasurement();
      return;
    }

    this.tooltipPosition.set(position);
  }

  private calculateTooltipPosition(): TooltipPosition | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const button = this.chipButton()?.nativeElement;
    const tooltip = this.tooltipElement()?.nativeElement;
    if (!button || !tooltip) {
      return undefined;
    }

    const buttonRect = button.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = buttonRect.left;
    if (left + tooltipRect.width + margin > viewportWidth) {
      left = Math.max(margin, viewportWidth - tooltipRect.width - margin);
    } else {
      left = Math.max(margin, left);
    }

    let top = buttonRect.bottom + margin;
    if (top + tooltipRect.height + margin > viewportHeight) {
      top = buttonRect.top - tooltipRect.height - margin;
    }
    if (top < margin) {
      top = margin;
    }

    return {top, left};
  }

  private scheduleTooltipMeasurement(): void {
    if (!this.tooltipVisible() || typeof window === 'undefined') {
      return;
    }

    if (this.measurementTimerId !== undefined) {
      return;
    }

    this.measurementTimerId = window.setTimeout(() => {
      this.measurementTimerId = undefined;
      this.updateTooltipPosition();
    });
  }

  private cancelScheduledMeasurement(): void {
    if (this.measurementTimerId !== undefined && typeof window !== 'undefined') {
      window.clearTimeout(this.measurementTimerId);
    }
    this.measurementTimerId = undefined;
  }

  private buildTooltip(mod: VsMod, info?: VsModShortInfo): TooltipViewModel {
    const stats = this.formatStats(info);
    const title = (info?.name ?? mod.id).trim();
    const metaParts = [
      info?.author ? `by ${info.author}` : undefined,
      mod.version ? `v${mod.version}` : undefined,
    ].filter((value): value is string => !!value && value.trim().length > 0);
    const meta = metaParts.length ? metaParts.join(' • ') : undefined;
    const summary = info?.summary?.trim();

    return {
      title,
      meta,
      summary,
      stats,
      logoUrl: this.buildLogoUrl(info),
    };
  }

  private formatStats(info?: VsModShortInfo): string[] {
    if (!info) {
      return [];
    }

    return [
      typeof info.downloads === 'number' ? `Downloads: ${info.downloads}` : undefined,
      typeof info.follows === 'number' ? `Follows: ${info.follows}` : undefined,
      info.lastreleased ? `Last release: ${info.lastreleased}` : undefined,
    ].filter((value): value is string => !!value && value.trim().length > 0);
  }

  private buildLogoUrl(info?: VsModShortInfo): string | undefined {
    const logo = info?.logo?.trim();
    if (!logo) {
      return undefined;
    }

    if (/^https?:\/\//i.test(logo)) {
      return logo;
    }

    const base = environment.apiUrl.replace(/\/$/, '');
    const normalizedLogo = logo.startsWith('/') ? logo : `/${logo}`;
    return `${base}${normalizedLogo}`;
  }
}

interface TooltipPosition {
  top: number;
  left: number;
}

interface TooltipViewModel {
  title: string;
  meta?: string;
  summary?: string;
  stats: string[];
  logoUrl?: string;
}
