import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';

import {VsMod, VsServer} from '../../../services/servers.service';
import {ModCard} from './mod-card/mod-card';

const collator = new Intl.Collator();

// Expandable details of one server: description + basic info on the left, a mini card per mod
// on the right. Lives in a full-width row right under the server record. The body is only
// rendered while expanded, so rows with many mods stay cheap.
@Component({
  selector: 'app-server-details',
  standalone: true,
  imports: [ModCard],
  templateUrl: './server-details.html',
  styleUrl: './server-details.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerDetails {
  server = input.required<VsServer>();
  // The mod pane next to the list shows the details of the picked mod.
  modSelected = output<VsMod>();

  readonly opened = signal(false);
  readonly mods = computed(() =>
    (this.server().mods ?? []).slice().sort((a, b) => collator.compare(a.id, b.id)),
  );

  toggle() {
    this.opened.update(value => !value);
  }

  close() {
    this.opened.set(false);
  }

  // Click anywhere on the server record toggles the details, except on things that have their own action.
  onRowClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('a, button, input, select, textarea')) {
      return;
    }
    // a click on a scrollbar (e.g. the mods list) is not a click on the row
    if (target instanceof HTMLElement && target.clientWidth < target.offsetWidth) {
      if (event.offsetX >= target.clientWidth) {
        return;
      }
    }
    // the user is selecting text (e.g. to copy the server name)
    if (target.ownerDocument.getSelection()?.toString()) {
      return;
    }
    this.toggle();
  }
}
