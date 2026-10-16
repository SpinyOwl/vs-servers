import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type Design = 'classic' | 'a' | 'b';
type Theme = 'dark' | 'light';

const root = document.documentElement;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly designs: { id: Design; label: string; title: string }[] = [
    { id: 'classic', label: 'Classic', title: 'Original look' },
    { id: 'a', label: 'A · Compact', title: 'Dense dark table' },
    { id: 'b', label: 'B · Cards', title: 'Responsive cards' },
  ];

  // Initial values are set before first paint by the inline script in index.html.
  readonly design = signal<Design>((root.dataset['design'] as Design) || 'a');
  readonly theme = signal<Theme>((root.dataset['theme'] as Theme) || 'dark');

  setDesign(value: Design) {
    this.design.set(value);
    this.apply('design', value);
  }

  toggleTheme() {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
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
