import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import {VsMod, VsServer} from '../../../services/servers.service';
import {ModCard} from './mod-card/mod-card';

const collator = new Intl.Collator();

// Only one server record is expanded at a time: expanding another one collapses the previous.
const expandedServerIp = signal<string | undefined>(undefined);

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
  // Not `required`: the record's "Details" button reads `opened()` before this input is bound.
  server = input<VsServer>();
  // The mod pane next to the list shows the details of the picked mod.
  modSelected = output<VsMod>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly opened = computed(() => {
    const ip = this.server()?.serverIP;
    return ip !== undefined && expandedServerIp() === ip;
  });
  readonly mods = computed(() =>
    (this.server()?.mods ?? []).slice().sort((a, b) => collator.compare(a.id, b.id)),
  );

  toggle() {
    if (this.opened()) {
      this.close();
      return;
    }
    expandedServerIp.set(this.server()?.serverIP);
    // bring the expanded panel fully into view (with a margin, see scroll-margin in the styles);
    // also covers the layout shift when the previously expanded record above collapses
    afterNextRender(
      () => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.host.nativeElement.scrollIntoView({
          block: 'nearest',
          behavior: reduceMotion ? 'auto' : 'smooth',
        });
      },
      {injector: this.injector},
    );
  }

  close() {
    if (this.opened()) {
      expandedServerIp.set(undefined);
    }
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
