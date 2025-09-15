import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { Servers } from './servers/servers';
import { ServersService } from '../services/servers.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ServersService, useValue: { list$: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Vintage Story — Public Servers'
    );
  });
});

describe('Servers', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Servers],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ServersService, useValue: { list$: () => of([]) } },
      ],
    }).compileComponents();
  });

  it('should sort by players', () => {
    const fixture = TestBed.createComponent(Servers);
    const comp = fixture.componentInstance;
    comp.servers.set([
      { serverName: 'A', serverIP: '1', players: 3 },
      { serverName: 'B', serverIP: '2', players: 1 },
    ]);
    comp.sortBy('players');
    expect(comp.paged()[0].players).toBe(1);
    comp.sortBy('players');
    expect(comp.paged()[0].players).toBe(3);
  });
});

