import {VsServer} from '../../../services/servers.service';
import {
  FILTER_STORAGE_KEY,
  ServerFilterCriteria,
  compareVersions,
  indexServer,
  loadStoredFilters,
  matchesServer,
  saveStoredFilters,
} from './server-filters';

const base: ServerFilterCriteria = {
  name: '',
  version: '',
  mods: [],
  excludeMods: [],
  hasPassword: '',
  whitelisted: '',
  modded: '',
  freeSlots: false,
  online: false,
};

function server(over: Partial<VsServer>): VsServer {
  return {serverName: 'Test', players: 0, maxPlayers: 10, mods: [], ...over} as VsServer;
}

const mods = (...ids: string[]) => ids.map((id) => ({id})) as VsServer['mods'];

describe('compareVersions', () => {
  it('compares numerically per segment', () => {
    expect(compareVersions('1.20.10', '1.20.9')).toBe(1);
    expect(compareVersions('1.20.9', '1.20.10')).toBe(-1);
    expect(compareVersions('1.9.0', '1.20.0')).toBe(-1);
  });

  it('treats equal and zero-padded versions as equal', () => {
    expect(compareVersions('1.20', '1.20.0')).toBe(0);
    expect(compareVersions('1.20.1', '1.20.1')).toBe(0);
  });

  it('keeps comparing after zero padding', () => {
    expect(compareVersions('1.20', '1.20.0.1')).toBe(-1);
    expect(compareVersions('1.20.0.1', '1.20')).toBe(1);
  });

  it('sorts pre-releases below the release', () => {
    expect(compareVersions('1.20.0-rc.1', '1.20.0')).toBe(-1);
    expect(compareVersions('1.20.0', '1.20.0-rc.1')).toBe(1);
  });

  it('sorts an array descending', () => {
    const sorted = ['1.19.8', '1.20.10', '1.20.9'].sort((a, b) => compareVersions(b, a));
    expect(sorted).toEqual(['1.20.10', '1.20.9', '1.19.8']);
  });
});

describe('matchesServer', () => {
  it('free slots', () => {
    const c = {...base, freeSlots: true};
    expect(matchesServer(indexServer(server({players: 3, maxPlayers: 10})), c)).toBeTrue();
    expect(matchesServer(indexServer(server({players: 10, maxPlayers: 10})), c)).toBeFalse();
  });

  it('online now', () => {
    const c = {...base, online: true};
    expect(matchesServer(indexServer(server({players: 1})), c)).toBeTrue();
    expect(matchesServer(indexServer(server({players: 0})), c)).toBeFalse();
  });

  it('vanilla and modded', () => {
    const vanilla = indexServer(server({mods: []}));
    const modded = indexServer(server({mods: mods('a')}));
    expect(matchesServer(vanilla, {...base, modded: 'false'})).toBeTrue();
    expect(matchesServer(modded, {...base, modded: 'false'})).toBeFalse();
    expect(matchesServer(modded, {...base, modded: 'true'})).toBeTrue();
    expect(matchesServer(vanilla, {...base, modded: 'true'})).toBeFalse();
  });

  it('requires all included mods and none of the excluded ones', () => {
    const s = indexServer(server({mods: mods('Alpha', 'beta')}));
    expect(matchesServer(s, {...base, mods: ['alpha', 'beta']})).toBeTrue();
    expect(matchesServer(s, {...base, mods: ['alpha', 'gamma']})).toBeFalse();
    expect(matchesServer(s, {...base, excludeMods: ['gamma']})).toBeTrue();
    expect(matchesServer(s, {...base, excludeMods: ['bet']})).toBeFalse();
  });
});

describe('stored filters', () => {
  function memory(initial?: string): Storage {
    const data = new Map<string, string>(initial ? [[FILTER_STORAGE_KEY, initial]] : []);
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    } as Storage;
  }

  it('round-trips', () => {
    const st = memory();
    saveStoredFilters(st, {name: 'x', mod: ['a', 'b']});
    expect(loadStoredFilters(st)).toEqual({name: 'x', mod: ['a', 'b']});
  });

  it('survives garbage and throwing storage', () => {
    expect(loadStoredFilters(memory('not json'))).toEqual({});
    expect(loadStoredFilters(memory('[1]'))).toEqual({});
    const bad = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadStoredFilters(bad)).toEqual({});
    expect(() => saveStoredFilters(bad, {})).not.toThrow();
  });
});
