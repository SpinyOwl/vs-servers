import {provideZonelessChangeDetection} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {ServerList} from './server-list';
import {ModsService} from '../../../services/mods.service';
import {VsServer} from '../../../services/servers.service';

const server = (over: Partial<VsServer>) =>
  ({serverName: 'S', serverIP: '0', players: 0, maxPlayers: 10, mods: [], ...over}) as VsServer;

describe('ServerList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerList],
      providers: [
        provideZonelessChangeDetection(),
        {provide: ModsService, useValue: {getAll$: () => of([])}},
      ],
    }).compileComponents();
  });

  function create(servers: VsServer[]) {
    const fixture = TestBed.createComponent(ServerList);
    fixture.componentRef.setInput('servers', servers);
    return fixture.componentInstance;
  }

  it('sorts by players descending by default and toggles on sortBy', () => {
    const comp = create([
      server({serverName: 'A', serverIP: '1', players: 3}),
      server({serverName: 'B', serverIP: '2', players: 1}),
    ]);
    expect(comp.paged()[0].players).toBe(3);
    comp.sortBy('players');
    expect(comp.paged()[0].players).toBe(1);
    comp.sortBy('players');
    expect(comp.paged()[0].players).toBe(3);
  });

  it('sorts versions semantically', () => {
    const comp = create([
      server({serverIP: '1', gameVersion: '1.20.9'}),
      server({serverIP: '2', gameVersion: '1.20.10'}),
    ]);
    expect(comp.versions()).toEqual(['1.20.10', '1.20.9']);
  });

  it('applies filters and reports/removes active ones', () => {
    const comp = create([
      server({serverIP: '1', players: 10, maxPlayers: 10}),
      server({serverIP: '2', players: 2, maxPlayers: 10}),
    ]);
    comp.filterFreeSlots.set(true);
    expect(comp.filtered().length).toBe(1);
    expect(comp.activeFilters().map((f) => f.id)).toEqual(['free']);
    comp.removeFilter(comp.activeFilters()[0]);
    expect(comp.filtered().length).toBe(2);
    comp.filterOnline.set(true);
    comp.filterModded.set('true');
    comp.resetFilters();
    expect(comp.activeFilters()).toEqual([]);
  });
});
