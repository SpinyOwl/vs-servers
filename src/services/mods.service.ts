import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, catchError, finalize, map, of, shareReplay} from 'rxjs';
import {environment} from '../environments/environment';

export interface VsModInfo {
  id: string;
  name?: string;
  version?: string;
  text?: string;
  modid: string;
  assetid?: string | number;
  logofile?: string;

  [key: string]: any;
}

interface CacheEntry {
  data: VsModInfo;
  timestamp: number;
}

interface ModsListCacheEntry {
  data: VsModShortInfo[];
  timestamp: number;
}

interface VsModResponse {
  statuscode: string;
  mod: VsModInfo;
}

interface VsModsResponse {
  statuscode: string;
  mods: VsModShortInfo[];
}

export interface VsModShortInfo {
  modid: number;
  assetid: number;
  downloads: number;
  follows: number;
  trendingpoints: number;
  comments: number;
  name: string;
  summary: string;
  modidstrs: string[];
  author: string;
  urlalias: string | null;
  side: string;
  type: string;
  logo: string | null;
  tags: string[];
  lastreleased: string;
}

@Injectable({providedIn: 'root'})
export class ModsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly cache = new Map<string, CacheEntry>();
  private modsListCache?: ModsListCacheEntry;
  private modsListRequest$?: Observable<VsModShortInfo[]>;
  private readonly ttl = 60 * 60 * 1000; // 1 hour

  get$(modid: string): Observable<VsModInfo> {
    const now = Date.now();
    const cached = this.cache.get(modid);
    if (cached && now - cached.timestamp < this.ttl) {
      return of(cached.data);
    }

    // convert response to VsModInfo
    return this.getVsModInfoObservable(modid)
      .pipe(map(response => {
        this.cache.set(modid, {data: response.mod, timestamp: Date.now()});
        return response.mod;
      }));
  }

  private getVsModInfoObservable(modid: string) {
    // http get with error handling
    let url = `${this.base}/m/mod/${modid}`;
    console.log(`Fetching mod info for ${modid} from "${url}"`);
    return this.http.get<VsModResponse>(url).pipe(
      map(response => {
        if (response.statuscode === '200') {
          return response;
        } else {
          console.error(`Failed to fetch mod info: ${JSON.stringify(response)}`);
          throw new Error(`Failed to fetch mod info: ${response.statuscode}`);
        }
      })
    );
  }

  getAll$(): Observable<VsModShortInfo[]> {
    const now = Date.now();
    const cached = this.modsListCache;
    if (cached && now - cached.timestamp < this.ttl) {
      return of(cached.data);
    }

    if (this.modsListRequest$) {
      return this.modsListRequest$;
    }

    this.modsListRequest$ = this.http.get<VsModsResponse>(`${this.base}/m/mods`).pipe(
      map(response => {
        if (response.statuscode === '200' && Array.isArray(response.mods)) {
          this.modsListCache = {data: response.mods, timestamp: Date.now()};
          return response.mods;
        }

        console.error(`Failed to fetch mods list: ${JSON.stringify(response)}`);
        return [] as VsModShortInfo[];
      }),
      catchError(err => {
        console.error('Failed to fetch mods list', err);
        return of([] as VsModShortInfo[]);
      }),
      finalize(() => {
        this.modsListRequest$ = undefined;
      }),
      shareReplay(1)
    );

    return this.modsListRequest$;
  }

  shortInfo$(modid: string): Observable<VsModShortInfo | undefined> {
    return this.getAll$().pipe(
      map(list => {
        const trimmed = modid?.trim();
        if (!trimmed) {
          return undefined;
        }

        return list.find(mod => this.matchesMod(trimmed, mod));
      })
    );
  }

  private matchesMod(id: string, mod: VsModShortInfo): boolean {
    const candidates = [mod.urlalias, ...(mod.modidstrs ?? [])]
      .filter((value): value is string => typeof value === 'string');
    if (!candidates.length) {
      return false;
    }

    const idLower = id.toLowerCase();
    return candidates.some(candidate => candidate === id || candidate === idLower || candidate.toLowerCase() === idLower);
  }
}

