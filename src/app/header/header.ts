import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type Design = 'classic' | 'a' | 'b';
type Theme = 'classic' | 'dark' | 'light';
const THEMES: Theme[] = ['classic', 'dark', 'light'];

const root = document.documentElement;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly designs: { id: Design; label: string; title: string }[] = [
    { id: 'classic', label: 'Original', title: 'Original table layout' },
    { id: 'a', label: 'Compact', title: 'Dense table' },
    { id: 'b', label: 'Cards', title: 'Responsive cards' },
  ];

  // Initial values are set before first paint by the inline script in index.html.
  readonly design = signal<Design>((root.dataset['design'] as Design) || 'a');
  readonly theme = signal<Theme>((root.dataset['theme'] as Theme) || 'classic');

  setDesign(value: Design) {
    this.design.set(value);
    this.apply('design', value);
  }

  toggleTheme() {
    const next = THEMES[(THEMES.indexOf(this.theme()) + 1) % THEMES.length];
    this.theme.set(next);
    this.apply('theme', next);
  }

  private apply(key: 'design' | 'theme', value: string) {
    root.setAttribute('data-' + key, value);
    try {
      localStorage.setItem('vs-' + key, value);
    } catch {
      /* storage unavailable */
    }
  }
}
