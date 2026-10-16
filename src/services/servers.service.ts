import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, catchError, map, merge, of, switchMap, tap, timer } from 'rxjs';
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

  private readonly manualRefresh$ = new Subject<void>();
  private readonly _servers = signal<VsServer[]>([]);
  private readonly _loading = signal<boolean>(true);
  private readonly _error = signal<string | null>(null);

  readonly servers = this._servers.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    this.startAutoRefresh();
  }

  reload(): void {
    this.manualRefresh$.next();
  }

  private startAutoRefresh(): void {
    merge(timer(0, this.refreshIntervalMs), this.manualRefresh$)
      .pipe(
        tap(() => this._loading.set(true)),
        switchMap(() =>
          this.http.get<ListResponse>(`${this.base}/s/servers/list`).pipe(
            map(res => {
              if (res.status === 'ok' && Array.isArray(res.data)) {
                return res.data;
              }
              throw new Error(`Unexpected response status: ${res.status}`);
            }),
            tap(list => {
              this._servers.set(list);
              this._error.set(null);
            }),
            catchError(err => {
              console.error('Failed to fetch servers list', err);
              // keep previously loaded servers on a failed refresh
              this._error.set(String(err?.message ?? err));
              return of(null);
            })
          )
        ),
        tap(() => this._loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }
}
