import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable, of} from 'rxjs';
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

interface VsModResponse {
  statuscode: string;
  mod: VsModInfo;
}

@Injectable({providedIn: 'root'})
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
}

