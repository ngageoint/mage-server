import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ArchiveFormat, CompletionAction, SFTPPluginConfig, TriggerRule, ConnectionTestResult, PluginStatus } from '../entities/entities.format';
import { ConfigurationService } from './configuration.service';
import { Subject, interval, takeUntil } from 'rxjs';

@Component({
  selector: 'sftp-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

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
      port: 22,
      path: '',
      username: ''
    }
  }

  private originalConfiguration: string = ''

  status: PluginStatus = {
    connected: false
  }
  isSaving = false
  isTesting = false
  lastTestResult: ConnectionTestResult | null = null
  loadError: string | null = null

  get hasUnsavedChanges(): boolean {
    return JSON.stringify(this.configuration) !== this.originalConfiguration
  }

  constructor(
    public service: ConfigurationService,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.loadConfiguration()
    this.loadStatus()

    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.configuration.enabled) {
          this.loadStatus()
        }
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadConfiguration(): void {
    this.service.getConfiguration().subscribe({
      next: (configuration) => {
        this.configuration = configuration
        this.originalConfiguration = JSON.stringify(configuration)
      },
      error: (error) => {
        this.loadError = 'Failed to load configuration'
        this.snackBar.open('Failed to load SFTP configuration', 'Dismiss', {
          duration: 5000,
          panelClass: ['error-snackbar']
        })
      }
    })
  }

  private loadStatus(): void {
    this.service.getStatus().subscribe({
      next: (status) => {
        this.status = status
      },
      error: (error) => {
        console.error('Failed to load status:', error)
      }
    })
  }

  save(): void {
    this.isSaving = true
    this.service.updateConfiguration(this.configuration).subscribe({
      next: (response) => {
        this.isSaving = false
        if (response.success) {
          this.snackBar.open('Configuration saved successfully', 'Dismiss', {
            duration: 3000,
            panelClass: ['success-snackbar']
          })
          if (response.configuration) {
            this.configuration = response.configuration
            this.originalConfiguration = JSON.stringify(response.configuration)
          } else {
            this.originalConfiguration = JSON.stringify(this.configuration)
          }
          this.loadStatus()
        } else {
          this.snackBar.open(response.message || 'Failed to save configuration', 'Dismiss', {
            duration: 5000,
            panelClass: ['error-snackbar']
          })
        }
      },
      error: (error) => {
        this.isSaving = false
        this.snackBar.open(error.message || 'Failed to save configuration', 'Dismiss', {
          duration: 5000,
          panelClass: ['error-snackbar']
        })
      }
    })
  }

  testConnection(): void {
    this.isTesting = true
    this.lastTestResult = null
    
    this.service.testConnection({ sftpClient: this.configuration.sftpClient }).subscribe({
      next: (result) => {
        this.isTesting = false
        this.lastTestResult = result
        
        if (result.success) {
          this.snackBar.open('Connection successful!', 'Dismiss', {
            duration: 5000,
            panelClass: ['success-snackbar']
          })
        } else {
          this.snackBar.open(result.message, 'Dismiss', {
            duration: 8000,
            panelClass: ['error-snackbar']
          })
        }
      },
      error: (error) => {
        this.isTesting = false
        this.lastTestResult = {
          success: false,
          message: error.message || 'Connection test failed'
        }
        this.snackBar.open(this.lastTestResult.message, 'Dismiss', {
          duration: 8000,
          panelClass: ['error-snackbar']
        })
      }
    })
  }
}
