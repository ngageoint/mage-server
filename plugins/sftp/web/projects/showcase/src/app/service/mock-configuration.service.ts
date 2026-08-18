import { ConfigurationApi } from 'projects/main/src/lib/configuration/configuration.service'
import { ArchiveFormat, CompletionAction, ConnectionTestResult, EventFilterMode, MageEventSummary, SFTPPluginConfig, TriggerRule } from 'projects/main/src/lib/entities/entities.format'
import { Observable, of } from 'rxjs'

export class MockConfigurationService implements ConfigurationApi {
  getConfiguration(): Observable<SFTPPluginConfig> {
    return of({
      enabled: true,
      interval: 60,
      pageSize: 200,
      eventFilterMode: EventFilterMode.All,
      events: [],
      archiveFormat: ArchiveFormat.GeoJSON,
      completionAction: CompletionAction.None,
      initiation: {
        rule: TriggerRule.Create,
        timeout: 60
      },
      sftpClient: {
        host: 'mock.example.com',
        port: 22,
        path: 'mockpath',
        username: 'mockusername',
        password: 'mockpassword'
      },
      hasPrivateKey: true
    })
  }

  updateConfiguration(request: SFTPPluginConfig): Observable<SFTPPluginConfig> {
    return of(JSON.parse(JSON.stringify(request)))
  }

  testConnection(_config?: Partial<SFTPPluginConfig>): Observable<ConnectionTestResult> {
    return of({
      success: true,
      message: 'Connected to mock.example.com:22 with access to "mockpath"',
      timestamp: new Date()
    })
  }

  savePrivateKey(_privateKey: string): Observable<void> {
    return of(undefined)
  }

  resetConfiguration(): Observable<SFTPPluginConfig> {
    return this.getConfiguration()
  }

  getEvents(): Observable<MageEventSummary[]> {
    return of([
      { id: 1, name: 'Wildfire Watch' },
      { id: 2, name: 'Flood Response' },
      { id: 3, name: 'Storm Recon' },
      { id: 4, name: 'Border Patrol Alpha' },
      { id: 5, name: 'Coastal Watch' },
      { id: 6, name: 'Night Ops Bravo' },
      { id: 7, name: 'Search and Rescue' },
      { id: 8, name: 'Training Exercise' }
    ])
  }
}
