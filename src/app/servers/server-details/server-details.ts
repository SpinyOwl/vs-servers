import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import {VsMod, VsServer} from '../../../services/servers.service';
import {ModCard} from './mod-card/mod-card';

const collator = new Intl.Collator();

// Modal with two columns: description + basic info, and a mini card per mod.
// The body is only rendered while the dialog is open, so rows with many mods stay cheap.
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
  modSelected = output<VsMod>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly opened = signal(false);
  readonly mods = computed(() =>
    (this.server().mods ?? []).slice().sort((a, b) => collator.compare(a.id, b.id)),
  );

  open() {
    this.opened.set(true);
    this.dialog().nativeElement.showModal();
  }

  close() {
    this.dialog().nativeElement.close();
  }

  // Click anywhere on the server row opens the dialog, except on things that have their own action.
  onRowClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('a, button, input, select, textarea, dialog')) {
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
    this.open();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }

  selectMod(mod: VsMod) {
    this.close();
    this.modSelected.emit(mod);
  }
}
