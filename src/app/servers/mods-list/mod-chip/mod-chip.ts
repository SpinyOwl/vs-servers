import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject} from '@angular/core';
import {CommonModule} from '@angular/common';

import {VsMod} from '../../../../services/servers.service';
import {ModsService, VsModShortInfo} from '../../../../services/mods.service';
import {Observable, map, startWith} from 'rxjs';

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

  tooltip$!: Observable<string>;

  ngOnChanges(changes: SimpleChanges): void {
    if ('mod' in changes && this.mod) {
      this.tooltip$ = this.modsService.shortInfo$(this.mod.id).pipe(
        map(info => this.buildTooltip(this.mod, info)),
        startWith(this.buildTooltip(this.mod))
      );
    }
  }

  onClick() {
    this.view.emit(this.mod);
  }

  private buildTooltip(mod: VsMod, info?: VsModShortInfo): string {
    const details = [
      info?.summary,
      this.formatStats(info)
    ].filter((value): value is string => !!value && value.trim().length > 0);

    const headerParts = [
      info?.name ?? mod.id,
      info?.author ? `by ${info.author}` : undefined,
      mod.version ? `v${mod.version}` : undefined
    ].filter((value): value is string => !!value && value.trim().length > 0);

    return [headerParts.join(' • '), ...details]
      .filter((value) => value && value.trim().length > 0)
      .join('\n');
  }

  private formatStats(info?: VsModShortInfo): string | undefined {
    if (!info) {
      return undefined;
    }

    const stats = [
      typeof info.downloads === 'number' ? `Downloads: ${info.downloads}` : undefined,
      typeof info.follows === 'number' ? `Follows: ${info.follows}` : undefined,
      info.lastreleased ? `Last release: ${info.lastreleased}` : undefined,
    ].filter((value): value is string => !!value && value.trim().length > 0);

    return stats.length ? stats.join(' • ') : undefined;
  }
}
