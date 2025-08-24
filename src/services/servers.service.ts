import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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
  private readonly base = '/api'; // dev: proxy -> https://masterserver.vintagestory.at/api/v1

  list$(): Observable<VsServer[]> {
    return this.http.get<ListResponse>(`${this.base}/servers/list`).pipe(
      map(res => (res.status === 'ok' && Array.isArray(res.data)) ? res.data : [])
    );
  }
}
