import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SFTPPluginConfig, ConnectionTestResult, MageEventSummary } from '../entities/entities.format';

export const baseUrl = '/plugins/@ngageoint/mage.sftp.service'

export function errorMessage(error: any, fallback: string): string {
  return (typeof error.error === 'string' && error.error) || error.message || fallback
}

export interface ConfigurationApi {
  getConfiguration(): Observable<SFTPPluginConfig>
  updateConfiguration(request: SFTPPluginConfig): Observable<SFTPPluginConfig>
  testConnection(config?: Partial<SFTPPluginConfig>): Observable<ConnectionTestResult>
  savePrivateKey(privateKey: string): Observable<void>
  resetConfiguration(): Observable<SFTPPluginConfig>
  getEvents(): Observable<MageEventSummary[]>
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService implements ConfigurationApi {
  constructor(private http: HttpClient) { }

  getConfiguration(): Observable<SFTPPluginConfig> {
    return this.http.get<SFTPPluginConfig>(`${baseUrl}/configuration`);
  }

  updateConfiguration(request: SFTPPluginConfig): Observable<SFTPPluginConfig> {
    return this.http.post<SFTPPluginConfig>(`${baseUrl}/configuration`, request, {
      headers: { "Content-Type": "application/json" }
    });
  }

  testConnection(config?: Partial<SFTPPluginConfig>): Observable<ConnectionTestResult> {
    return this.http.post<ConnectionTestResult>(`${baseUrl}/test-connection`, config || {}, {
      headers: { "Content-Type": "application/json" }
    });
  }

  savePrivateKey(privateKey: string): Observable<void> {
    return this.http.post<void>(`${baseUrl}/private-key`, { privateKey }, {
      headers: { "Content-Type": "application/json" }
    });
  }

  resetConfiguration(): Observable<SFTPPluginConfig> {
    return this.http.post<SFTPPluginConfig>(`${baseUrl}/reset`, {});
  }

  getEvents(): Observable<MageEventSummary[]> {
    return this.http.get<MageEventSummary[]>(`${baseUrl}/events`);
  }
}