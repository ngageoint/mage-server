import { Component, OnInit } from '@angular/core';
import { ArchiveFormat, CompletionAction, SFTPPluginConfig, TriggerRule } from '../entities/entities.format';
import { ConfigurationService } from './configuration.service';

@Component({
  selector: 'sftp-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit {

  formats: ArchiveFormat[] = [
    ArchiveFormat.GeoJSON
  ]

  completionActions: CompletionAction[] = [
    CompletionAction.None,
    CompletionAction.Archive
  ]

  triggerRules: {
    title: string,
    value: TriggerRule
  }[] = [
    { title: 'Create', value: TriggerRule.Create },
    { title: 'Create And Update', value: TriggerRule.CreateAndUpdate },
  ]

  configuration: SFTPPluginConfig = {
    enabled: false,
    archiveFormat: ArchiveFormat.GeoJSON,
    completionAction: CompletionAction.None,
    initiation: {
      rule: TriggerRule.CreateAndUpdate,
      timeout: 60
    },
    interval: 60,
    pageSize: 10,
    events: [],
    sftpClient: {
      host: '',
      path: '',
      username: '',
      password: ''
    }
  }

  constructor(
    public service: ConfigurationService,
  ) {
  }

  ngOnInit(): void {
    this.service.getConfiguration().subscribe( configuration => {
      this.configuration = configuration
    })
  }

  save(): void {
    this.service.updateConfiguration(this.configuration).subscribe(configuration => {
      this.configuration = configuration
    })
  }
}
