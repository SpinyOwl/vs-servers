import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection()],
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
    expect(compiled.querySelector('h1')?.textContent).toContain('Vintage Story — Public Servers');
    expect(compiled.querySelector('th:nth-child(2)')?.textContent).toContain('Description');
  });

  it('should sort by players', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.servers.set([
      { serverName: 'A', serverIP: '1', players: 3 },
      { serverName: 'B', serverIP: '2', players: 1 }
    ]);
    app.sortBy('players');
    expect(app.paged()[0].players).toBe(1);
    app.sortBy('players');
    expect(app.paged()[0].players).toBe(3);
  });
});
