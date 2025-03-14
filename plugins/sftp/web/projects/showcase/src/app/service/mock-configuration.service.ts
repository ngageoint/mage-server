import { ConfigurationApi } from 'projects/admin/src/lib/configuration/configuration.service'
import { ArchiveFormat, CompletionAction, SFTPPluginConfig, TriggerRule } from 'projects/admin/src/lib/entities/entities.format'
import { Observable, of } from 'rxjs'

export class MockConfigurationService implements ConfigurationApi {
  getConfiguration(): Observable<SFTPPluginConfig> {
    return of({
      enabled: true,
      interval: 1000,
      pageSize: 200,
      events: [],
      archiveFormat: ArchiveFormat.GeoJSON,
      completionAction: CompletionAction.None,
      initiation: {
        rule: TriggerRule.Create,
        timeout: 60
      },
      sftpClient: {
        host: 'http://mock.com',
        path: 'mockpath',
        username: 'mockusername',
        password: 'mockpassword'
      }
    })
  }

  updateConfiguration(request: SFTPPluginConfig): Observable<SFTPPluginConfig> {
    return of(JSON.parse(JSON.stringify(request)))
  }
}