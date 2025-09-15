import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {VsMod} from '../../services/servers.service';
import {ModsService, VsModInfo} from '../../services/mods.service';

@Component({
  selector: 'app-mod-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mod-chip.html',
  styleUrl: './mod-chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModChip implements OnInit {
  @Input({required: true}) mod!: VsMod;

  private readonly mods = inject(ModsService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);


  private hovered = false;

  // ---- Placeholder-first state (signals auto-trigger view updates on OnPush) ----
  // Link URL starts as placeholder; becomes real when mod info arrives.
  url = signal<string>('#');

  // Tooltip content placeholders
  tipTitle = signal<string>('Loading…');
  tipHtml = signal<string>('Fetching details…'); // rendered via [innerHTML]
  tipLogo = signal<string | null>(null);

  // convenience: fallback logo/name helpers if needed elsewhere
  logoUrl = (info: VsModInfo) => (info as any)['logofile'] as string | undefined;

  ngOnInit(): void {
    // Initialize with safe placeholders derived from input, so it looks “ready” instantly.
    const id = this.mod?.id ?? '';
    this.tipTitle.set(id || 'Loading…');
    this.tipHtml.set('Hover to load details…');

    // Start async fetch; any emitted values will update the view automatically.
    this.mods
      .get$(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (info) => {
          // Title / description
          this.tipTitle.set(info?.name || id);
          this.tipHtml.set(info?.text || 'No description.');

          // Logo
          const logo = (info as any)?.logofile as string | undefined;
          this.tipLogo.set(logo || null);

          // Prefer urlalias if provided; otherwise keep id-based URL
          const assetid = (info as any)?.assetid as string | undefined;
          if (assetid) {
            this.url.set(`https://mods.vintagestory.at/show/mod/${assetid}`);
          }
        },
        error: () => {
          this.tipHtml.set('Failed to load details. Hover again to retry.');
          // keep existing URL fallback; nothing else to do
        },
      });
  }

  onMouseEnter() {
    this.hovered = true;
    this.updateTooltipPosition();
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


}
