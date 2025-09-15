import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../environments/environment';

export interface VsModInfo {
  id: string;
  name?: string;
  version?: string;
  [key: string]: any;
}

interface CacheEntry {
  data: VsModInfo;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ModsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttl = 60 * 60 * 1000; // 1 hour

  get$(modid: string): Observable<VsModInfo> {
    const now = Date.now();
    const cached = this.cache.get(modid);
    if (cached && now - cached.timestamp < this.ttl) {
      return of(cached.data);
    }

    return this.http.get<VsModInfo>(`${this.base}/m/mod/${modid}`).pipe(
      tap(data => this.cache.set(modid, { data, timestamp: Date.now() }))
    );
  }
}

