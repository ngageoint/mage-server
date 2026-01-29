import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { SFTPPluginConfig, ConnectionTestResult, PluginStatus } from '../entities/entities.format';

export const baseUrl = '/plugins/@ngageoint/mage.sftp.service'

export interface ConfigurationResponse {
  success: boolean
  message: string
  configuration?: SFTPPluginConfig
}

export interface ConfigurationApi {
  getConfiguration(): Observable<SFTPPluginConfig>
  updateConfiguration(request: SFTPPluginConfig): Observable<ConfigurationResponse>
  testConnection(config?: Partial<SFTPPluginConfig>): Observable<ConnectionTestResult>
  getStatus(): Observable<PluginStatus>
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService implements ConfigurationApi {
  constructor(private http: HttpClient) { }

  getConfiguration(): Observable<SFTPPluginConfig> {
    return this.http.get<SFTPPluginConfig>(`${baseUrl}/configuration`);
  }

  updateConfiguration(request: SFTPPluginConfig): Observable<ConfigurationResponse> {
    return this.http.post<ConfigurationResponse>(`${baseUrl}/configuration`, request, {
      headers: { "Content-Type": "application/json" }
    }).pipe(
      catchError(error => {
        return of({
          success: false,
          message: error.error?.message || error.message || 'Failed to save configuration'
        })
      })
    );
  }

  testConnection(config?: Partial<SFTPPluginConfig>): Observable<ConnectionTestResult> {
    return this.http.post<ConnectionTestResult>(`${baseUrl}/test-connection`, config || {}, {
      headers: { "Content-Type": "application/json" }
    }).pipe(
      catchError(error => {
        return of({
          success: false,
          message: error.error?.message || error.message || 'Connection test failed'
        })
      })
    );
  }

  getStatus(): Observable<PluginStatus> {
    return this.http.get<PluginStatus>(`${baseUrl}/status`).pipe(
      catchError(error => {
        return of({
          connected: false,
          lastError: error.error?.message || error.message || 'Failed to get status'
        })
      })
    );
  }
}