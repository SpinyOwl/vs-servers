import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {switchMap} from 'rxjs';

import {VsMod} from '../../../../services/servers.service';
import {ModsService, VsModShortInfo} from '../../../../services/mods.service';
import {environment} from '../../../../environments/environment';

// Mini card for one mod: the same details the chip tooltip shows, always visible.
@Component({
  selector: 'app-mod-card',
  standalone: true,
  templateUrl: './mod-card.html',
  styleUrl: './mod-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModCard {
  mod = input.required<VsMod>();
  selected = input(false);
  view = output<VsMod>();

  private readonly modsService = inject(ModsService);

  private readonly info = toSignal(
    toObservable(this.mod).pipe(switchMap(mod => this.modsService.shortInfo$(mod.id))),
  );

  readonly card = computed(() => {
    const mod = this.mod();
    const info = this.info();
    const meta = [info?.author ? `by ${info.author}` : '', mod.version ? `v${mod.version}` : '']
      .filter(Boolean)
      .join(' • ');
    return {
      title: (info?.name ?? mod.id).trim(),
      meta,
      summary: info?.summary?.trim(),
      stats: this.stats(info),
      logoUrl: this.logoUrl(info),
    };
  });

  private stats(info?: VsModShortInfo): string[] {
    if (!info) {
      return [];
    }
    return [
      typeof info.downloads === 'number' ? `Downloads: ${info.downloads}` : '',
      typeof info.follows === 'number' ? `Follows: ${info.follows}` : '',
      info.lastreleased ? `Last release: ${info.lastreleased}` : '',
    ].filter(Boolean);
  }

  private logoUrl(info?: VsModShortInfo): string | undefined {
    const logo = info?.logo?.trim();
    if (!logo) {
      return undefined;
    }
    if (/^https?:\/\//i.test(logo)) {
      return logo;
    }
    const base = environment.apiUrl.replace(/\/$/, '');
    return `${base}${logo.startsWith('/') ? logo : `/${logo}`}`;
  }
}
