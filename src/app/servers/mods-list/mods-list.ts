import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {VsMod} from '../../../services/servers.service';
import {ModChip} from './mod-chip/mod-chip';

const collator = new Intl.Collator();

@Component({
  selector: 'app-mods-list',
  standalone: true,
  imports: [ModChip],
  templateUrl: './mods-list.html',
  styleUrl: './mods-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModsList {
  mods = input<VsMod[] | null | undefined>();
  modSelected = output<VsMod>();

  sortedMods = computed(() =>
    (this.mods() ?? []).slice().sort((a, b) => collator.compare(a.id, b.id))
  );
}
