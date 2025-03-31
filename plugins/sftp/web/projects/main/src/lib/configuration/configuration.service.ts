import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SFTPPluginConfig } from '../entities/entities.format';

export const baseUrl = '/plugins/@ngageoint/mage.sftp.service'

export interface ConfigurationApi {
  getConfiguration(): Observable<SFTPPluginConfig>
  updateConfiguration(request: SFTPPluginConfig): Observable<SFTPPluginConfig>
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  constructor(private http: HttpClient) { }

  getConfiguration(): Observable<SFTPPluginConfig> {
    return this.http.get<any>(`${baseUrl}/configuration`);
  }

  updateConfiguration(request: SFTPPluginConfig): Observable<SFTPPluginConfig> {
    return this.http.post<SFTPPluginConfig>(`${baseUrl}/configuration`, request, {
      headers: { "Content-Type": "application/json" }
    });
  }
}