import { DestroyRef, Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, Observable, catchError, map, of, switchMap, tap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../environments/environment';

export interface VsMod {
  id: string;
  version: string;
}
export interface VsServer {
  serverName: string;
  serverIP: string;
  mods?: VsMod[];
  gameVersion?: string;
  players?: number;
  maxPlayers?: number;
  hasPassword?: boolean;
  whitelisted?: boolean;
  gameDescription?: string;
  // other fields exist but we only need the above for the table
}
interface ListResponse {
  status: 'ok' | string;
  data: VsServer[];
}

@Injectable({ providedIn: 'root' })
export class ServersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly destroyRef = inject(DestroyRef);
  private readonly refreshIntervalMs = 15 * 60 * 1000;
  private readonly serversSubject = new ReplaySubject<VsServer[]>(1);
  private servers: VsServer[] = [];

  constructor() {
    this.startAutoRefresh();
  }

  list$(): Observable<VsServer[]> {
    return this.fetchServers();
  }

  getPage(pageSize: number, pageIndex: number): Observable<VsServer[]> {
    const size = Math.max(1, Math.floor(Number(pageSize) || 0));
    const index = Math.max(0, Math.floor(Number(pageIndex) || 0));
    return this.serversSubject.asObservable().pipe(
      map(() => {
        const start = index * size;
        return this.servers.slice(start, start + size);
      })
    );
  }

  private startAutoRefresh(): void {
    timer(0, this.refreshIntervalMs)
      .pipe(
        switchMap(() => this.fetchServers()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private fetchServers(): Observable<VsServer[]> {
    return this.http.get<ListResponse>(`${this.base}/s/servers/list`).pipe(
      map(res => (res.status === 'ok' && Array.isArray(res.data)) ? [...res.data] : []),
      catchError(err => {
        console.error('Failed to fetch servers list', err);
        return of([...this.servers]);
      }),
      tap(list => {
        this.servers = list;
        this.serversSubject.next([...list]);
      })
    );
  }
}
