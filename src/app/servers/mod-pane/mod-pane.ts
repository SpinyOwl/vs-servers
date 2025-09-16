import {Component, OnDestroy, computed, effect, inject, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ModsService, VsModInfo} from '../../../services/mods.service';
import {VsMod} from '../../../services/servers.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-mod-pane',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mod-pane.html',
  styleUrl: './mod-pane.scss',
})
export class ModPane implements OnDestroy {
  private readonly mods = inject(ModsService);
  private sub: Subscription | null = null;

  mod = input<VsMod | null>(null);
  close = output<void>();

  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  info = signal<VsModInfo | null>(null);

  modLink = computed(() => {
    const assetId = this.info()?.assetid;
    if (!assetId) return null;
    return `https://mods.vintagestory.at/show/mod/${assetId}`;
  });

  constructor() {
    effect(() => {
      const mod = this.mod();
      const id = mod?.id?.trim();

      if (this.sub) {
        this.sub.unsubscribe();
        this.sub = null;
      }

      if (!id) {
        this.info.set(null);
        this.loading.set(false);
        this.error.set(null);
        return;
      }

      this.info.set(null);
      this.loading.set(true);
      this.error.set(null);

      this.sub = this.mods.get$(id).subscribe({
        next: (info) => {
          this.info.set(info);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(String(err?.message ?? err ?? 'Failed to load mod information.'));
          this.loading.set(false);
        },
      });
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
  }

  onClose() {
    this.close.emit();
  }
}
