import { Component } from '@angular/core';
import { Header } from './header';
import { Servers } from './servers';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [Header, Servers],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}

