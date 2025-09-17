import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import {CommonModule} from '@angular/common';

import {VsMod} from '../../../../services/servers.service';
import {ModsService, VsModShortInfo} from '../../../../services/mods.service';
import {Observable, map, shareReplay, startWith, tap} from 'rxjs';
import {environment} from '../../../../environments/environment';

@Component({
  selector: 'app-mod-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mod-chip.html',
  styleUrl: './mod-chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModChip implements OnChanges {
  @Input({required: true}) mod!: VsMod;

  @Output() view = new EventEmitter<VsMod>();

  private readonly modsService = inject(ModsService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('chipButton', {static: true}) private readonly chipButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('tooltipElement') private tooltipElement?: ElementRef<HTMLDivElement>;

  tooltip$!: Observable<TooltipViewModel>;
  tooltipVisible = false;
  tooltipPosition?: TooltipPosition;
  readonly tooltipId = `mod-chip-tooltip-${Math.random().toString(36).slice(2)}`;
  private measurementTimerId?: number;

  ngOnChanges(changes: SimpleChanges): void {
    if ('mod' in changes && this.mod) {
      this.tooltip$ = this.modsService.shortInfo$(this.mod.id).pipe(
        map(info => this.buildTooltip(this.mod, info)),
        startWith(this.buildTooltip(this.mod)),
        tap(() => this.onTooltipContentChanged()),
        shareReplay({bufferSize: 1, refCount: true})
      );
    }
  }

  onClick() {
    this.view.emit(this.mod);
    this.onPointerLeave();
  }

  onPointerEnter() {
    this.tooltipVisible = true;
    this.tooltipPosition = undefined;
    this.cdr.markForCheck();
    this.scheduleTooltipMeasurement();
  }

  onPointerLeave() {
    this.tooltipVisible = false;
    this.tooltipPosition = undefined;
    this.cancelScheduledMeasurement();
    this.cdr.markForCheck();
  }

  onFocus() {
    this.tooltipVisible = true;
    this.tooltipPosition = undefined;
    this.cdr.markForCheck();
    this.scheduleTooltipMeasurement();
  }

  private updateTooltipPosition() {
    const position = this.calculateTooltipPosition();
    if (!position) {
      if (this.tooltipVisible) {
        this.scheduleTooltipMeasurement();
      }
      return;
    }

    this.tooltipPosition = position;
    this.cdr.markForCheck();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange() {
    if (!this.tooltipVisible) {
      return;
    }

    this.updateTooltipPosition();
  }

  private calculateTooltipPosition(): TooltipPosition | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const button = this.chipButton?.nativeElement;
    const tooltip = this.tooltipElement?.nativeElement;
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
    if (!this.tooltipVisible || typeof window === 'undefined') {
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
    if (this.measurementTimerId === undefined || typeof window === 'undefined') {
      this.measurementTimerId = undefined;
      return;
    }

    window.clearTimeout(this.measurementTimerId);
    this.measurementTimerId = undefined;
  }

  private onTooltipContentChanged(): void {
    if (!this.tooltipVisible) {
      return;
    }

    this.scheduleTooltipMeasurement();
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

    const labelParts = [
      [title, meta].filter(Boolean).join(' • '),
      summary,
      stats.length ? stats.join(' • ') : undefined,
    ].filter((value): value is string => !!value && value.trim().length > 0);

    return {
      label: labelParts.join('\n'),
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
  label: string;
  title: string;
  meta?: string;
  summary?: string;
  stats: string[];
  logoUrl?: string;
}
