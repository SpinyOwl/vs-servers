import {Component, computed, DestroyRef, ElementRef, inject, input, output, signal, ViewChild,} from '@angular/core';
import {CommonModule} from '@angular/common';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

import {ModsService, VsModShortInfo} from '../../../../services/mods.service';

interface ModSuggestionViewModel {
  value: string;
  description?: string;
}

@Component({
  selector: 'app-mod-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mod-filter.html',
  styleUrl: './mod-filter.scss',
})
export class ModFilter {
  mods = input<string[]>([]);
  placeholder = input<string>('Filter by mod id…');
  modsChange = output<string[]>();

  @ViewChild('inputElement') private readonly inputElement?: ElementRef<HTMLInputElement>;

  private readonly modsService = inject(ModsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly allMods = signal<VsModShortInfo[]>([]);
  private readonly focused = signal<boolean>(false);

  readonly query = signal<string>('');

  readonly suggestions = computed<ModSuggestionViewModel[]>(() => {
    const list = this.allMods();
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return [];
    }

    const selected = new Set(
      this.mods()
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0)
    );

    const unique = new Map<string, ModSuggestionViewModel>();

    for (const mod of list) {
      const candidates = this.getModCandidates(mod);
      const description = mod.name?.trim();
      for (const candidate of candidates) {
        const normalized = candidate.toLowerCase();
        if (selected.has(normalized)) {
          continue;
        }
        if (!normalized.includes(q)) {
          continue;
        }
        if (!unique.has(normalized)) {
          unique.set(normalized, {
            value: candidate,
            description,
          });
        }
      }
    }

    return Array.from(unique.values())
      .sort((a, b) => a.value.localeCompare(b.value))
      .slice(0, 20);
  });

  readonly showSuggestions = computed<boolean>(() => {
    return this.focused() && this.query().trim().length > 0 && this.suggestions().length > 0;
  });

  constructor() {
    this.modsService
      .getAll$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mods) => this.allMods.set(Array.isArray(mods) ? mods : []));
  }

  focusInput() {
    const input = this.inputElement?.nativeElement;
    if (input) {
      input.focus();
    }
  }

  onContainerClick() {
    this.focusInput();
  }

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.query.set(value);
  }

  onFocus() {
    this.focused.set(true);
  }

  onBlur() {
    this.focused.set(false);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      event.preventDefault();
      this.commitQuery();
      return;
    }

    if (event.key === 'Backspace' && !this.query().trim().length) {
      const current = this.mods();
      if (current.length > 0) {
        event.preventDefault();
        this.removeMod(current[current.length - 1]);
      }
    }

    if (event.key === 'Escape') {
      if (this.query().trim().length) {
        event.stopPropagation();
        this.query.set('');
      }
      this.focused.set(false);
    }
  }

  onSuggestionMouseDown(event: MouseEvent) {
    // Prevent the input from losing focus before the click handler runs.
    event.preventDefault();
  }

  selectSuggestion(value: string) {
    this.addMod(value);
  }

  removeMod(value: string) {
    const normalized = value.trim().toLowerCase();
    const next = this.mods().filter((item) => item.trim().toLowerCase() !== normalized);
    if (next.length !== this.mods().length) {
      this.modsChange.emit(next);
    }
  }

  removeModClicked(event: MouseEvent, value: string) {
    event.stopPropagation();
    this.removeMod(value);
    this.focusInput();
  }

  commitQuery() {
    const value = this.query().trim();
    this.addMod(value);
  }

  private addMod(raw: string) {
    const value = raw.trim();
    if (!value) {
      this.query.set('');
      return;
    }

    const normalized = value.toLowerCase();
    const current = this.mods();
    if (current.some((item) => item.trim().toLowerCase() === normalized)) {
      this.query.set('');
      return;
    }

    this.modsChange.emit([...current, value]);
    this.query.set('');
    this.focusInput();
  }

  private getModCandidates(mod: VsModShortInfo): string[] {
    const aliases = [mod.urlalias, ...(mod.modidstrs ?? [])]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value): value is string => value.length > 0);
    return Array.from(new Set(aliases));
  }
}
