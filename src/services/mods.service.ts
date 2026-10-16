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
  private readonly inflight = new Map<string, Observable<VsModInfo>>();
  private modsListCache?: ModsListCacheEntry;
  private modsListRequest$?: Observable<VsModShortInfo[]>;
  private modsIndex = new Map<string, VsModShortInfo>();
  private readonly ttl = 60 * 60 * 1000; // 1 hour

  get$(modid: string): Observable<VsModInfo> {
    const cached = this.cache.get(modid);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return of(cached.data);
    }

    const pending = this.inflight.get(modid);
    if (pending) {
      return pending;
    }

    const request$ = this.getVsModInfoObservable(modid).pipe(
      map(response => {
        this.cache.set(modid, {data: response.mod, timestamp: Date.now()});
        return response.mod;
      }),
      finalize(() => this.inflight.delete(modid)),
      shareReplay({bufferSize: 1, refCount: false})
    );
    this.inflight.set(modid, request$);
    return request$;
  }

  private getVsModInfoObservable(modid: string) {
    return this.http.get<VsModResponse>(`${this.base}/m/mod/${modid}`).pipe(
      map(response => {
        if (response.statuscode === '200') {
          return response;
        }
        console.error(`Failed to fetch mod info: ${JSON.stringify(response)}`);
        throw new Error(`Failed to fetch mod info: ${response.statuscode}`);
      })
    );
  }

  getAll$(): Observable<VsModShortInfo[]> {
    const cached = this.modsListCache;
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return of(cached.data);
    }

    if (this.modsListRequest$) {
      return this.modsListRequest$;
    }

    this.modsListRequest$ = this.http.get<VsModsResponse>(`${this.base}/m/mods`).pipe(
      map(response => {
        if (response.statuscode === '200' && Array.isArray(response.mods)) {
          this.modsListCache = {data: response.mods, timestamp: Date.now()};
          this.modsIndex = this.buildIndex(response.mods);
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
      map(() => {
        const key = modid?.trim().toLowerCase();
        return key ? this.modsIndex.get(key) : undefined;
      })
    );
  }

  private buildIndex(list: VsModShortInfo[]): Map<string, VsModShortInfo> {
    const index = new Map<string, VsModShortInfo>();
    for (const mod of list) {
      for (const alias of [mod.urlalias, ...(mod.modidstrs ?? [])]) {
        if (typeof alias === 'string' && alias) {
          const key = alias.toLowerCase();
          if (!index.has(key)) {
            index.set(key, mod);
          }
        }
      }
    }
    return index;
  }
}
