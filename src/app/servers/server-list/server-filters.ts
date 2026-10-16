import {VsServer} from '../../../services/servers.service';

export interface IndexedServer {
  server: VsServer;
  name: string;
  modIds: string[];
}

export interface ServerFilterCriteria {
  /** Lower-cased, trimmed name query. */
  name: string;
  version: string;
  /** Lower-cased mod ids; every one must be present. */
  mods: string[];
  /** Lower-cased mod ids; none may be present. */
  excludeMods: string[];
  /** '' (any) | 'true' | 'false' */
  hasPassword: string;
  whitelisted: string;
  /** '' (any) | 'true' (with mods) | 'false' (vanilla) */
  modded: string;
  freeSlots: boolean;
  online: boolean;
}

export function indexServer(server: VsServer): IndexedServer {
  return {
    server,
    name: (server.serverName ?? '').toLowerCase(),
    modIds: (server.mods ?? []).map((m) => m.id.toLowerCase()),
  };
}

export function matchesServer(
  {server: s, name, modIds}: IndexedServer,
  c: ServerFilterCriteria
): boolean {
  if (c.name && !name.includes(c.name)) return false;
  if (c.version && s.gameVersion !== c.version) return false;
  if (c.hasPassword && String(s.hasPassword ?? false) !== c.hasPassword) return false;
  if (c.whitelisted && String(s.whitelisted ?? false) !== c.whitelisted) return false;
  if (c.freeSlots && !((s.players ?? 0) < (s.maxPlayers ?? 0))) return false;
  if (c.online && !((s.players ?? 0) > 0)) return false;
  if (c.modded) {
    const hasMods = modIds.length > 0;
    if (hasMods !== (c.modded === 'true')) return false;
  }
  if (c.mods.length && !c.mods.every((mod) => modIds.some((id) => id.includes(mod)))) return false;
  if (c.excludeMods.length && c.excludeMods.some((mod) => modIds.some((id) => id.includes(mod)))) {
    return false;
  }
  return true;
}

const fallbackCollator = new Intl.Collator();

/** Semantic version comparison: 1.20.10 > 1.20.9; a pre-release (1.20.0-rc.1) sorts below its release. */
export function compareVersions(a: string, b: string): number {
  const ta = (a ?? '').trim().split(/[.\-+]/);
  const tb = (b ?? '').trim().split(/[.\-+]/);
  const isNum = (t: string) => /^\d+$/.test(t);
  const len = Math.max(ta.length, tb.length);
  for (let i = 0; i < len; i++) {
    const x = ta[i];
    const y = tb[i];
    // A missing token counts as 0 against a number, and as "release" against a pre-release tag.
    if (x === undefined) {
      if (!isNum(y)) return 1;
      if (Number(y) !== 0) return -1;
      continue;
    }
    if (y === undefined) {
      if (!isNum(x)) return -1;
      if (Number(x) !== 0) return 1;
      continue;
    }
    if (isNum(x) && isNum(y)) {
      const d = Number(x) - Number(y);
      if (d !== 0) return d < 0 ? -1 : 1;
    } else if (isNum(x) !== isNum(y)) {
      // A numeric part outranks a textual one (e.g. "1.20.0" vs "1.20.0-rc").
      return isNum(x) ? 1 : -1;
    } else {
      const d = fallbackCollator.compare(x, y);
      if (d !== 0) return d;
    }
  }
  return 0;
}

export const FILTER_STORAGE_KEY = 'vs-servers:filters';

export function loadStoredFilters(storage: Pick<Storage, 'getItem'> | null): Record<string, string | string[]> {
  try {
    const raw = storage?.getItem(FILTER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') result[k] = v;
      else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) result[k] = v as string[];
    }
    return result;
  } catch {
    return {};
  }
}

export function saveStoredFilters(
  storage: Pick<Storage, 'setItem'> | null,
  params: Record<string, string | string[]>
): void {
  try {
    storage?.setItem(FILTER_STORAGE_KEY, JSON.stringify(params));
  } catch {
    // Storage may be unavailable (private mode, quota); persistence is best-effort.
  }
}
