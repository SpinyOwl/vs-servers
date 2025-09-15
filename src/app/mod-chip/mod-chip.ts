import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';

import {VsMod} from '../../services/servers.service';

@Component({
  selector: 'app-mod-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mod-chip.html',
  styleUrl: './mod-chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModChip {
  @Input({required: true}) mod!: VsMod;

  @Output() view = new EventEmitter<VsMod>();

  onClick() {
    this.view.emit(this.mod);
  }
}
