import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ArchiveFormat, CompletionAction, SFTPPluginConfig, TriggerRule, ConnectionTestResult, EventFilterMode, MageEventSummary } from '../entities/entities.format';
import { ConfigurationService, errorMessage } from './configuration.service';
import { Subject } from 'rxjs';
import { ResetConfirmDialogComponent } from './reset-confirm-dialog.component';

@Component({
  standalone: false,
  selector: 'sftp-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.scss']
})
export class ConfigurationComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  readonly eventsSelectedPluralMap: { [key: string]: string } = {
    '=1': '1 event selected',
    'other': '# events selected'
  }

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

  eventFilterModes: {
    title: string,
    description: string,
    value: EventFilterMode
  }[] = [
      { title: 'All Events', description: 'Sync observations from all active events', value: EventFilterMode.All },
      { title: 'Include Events', description: 'Only sync observations from selected events', value: EventFilterMode.Include },
      { title: 'Exclude Events', description: 'Sync all events except selected events', value: EventFilterMode.Exclude },
    ]

  availableEvents: MageEventSummary[] = []
  eventSearchQuery = ''

  get filteredEvents(): MageEventSummary[] {
    if (!this.eventSearchQuery) {
      return this.availableEvents
    }
    const query = this.eventSearchQuery.toLowerCase()
    return this.availableEvents.filter(e => e.name.toLowerCase().includes(query))
  }

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
    eventFilterMode: EventFilterMode.All,
    events: [],
    sftpClient: {
      host: '',
      port: 22,
      path: '',
      username: ''
    }
  }

  private originalConfiguration: string = ''

  isSaving = false
  isTesting = false
  lastTestResult: ConnectionTestResult | null = null
  loadError: string | null = null

  hasPrivateKey = false
  showKeyInput = false
  privateKeyText = ''
  isSavingKey = false
  isResetting = false

  get hasUnsavedChanges(): boolean {
    return JSON.stringify(this.configuration) !== this.originalConfiguration
  }

  constructor(
    public service: ConfigurationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.loadConfiguration()
    this.loadEvents()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadConfiguration(): void {
    this.service.getConfiguration().subscribe({
      next: (configuration) => {
        this.hasPrivateKey = !!configuration.hasPrivateKey
        if (!configuration.eventFilterMode) {
          configuration.eventFilterMode = EventFilterMode.All
        }
        this.configuration = configuration
        this.originalConfiguration = JSON.stringify(configuration)
        if (this.configuration.enabled && this.configuration.sftpClient.host) {
          this.checkConnection()
        }
      },
      error: () => {
        this.loadError = 'Failed to load configuration'
        this.snackBar.open('Failed to load SFTP configuration', 'Dismiss', {
          duration: 5000,
          panelClass: ['error-snackbar']
        })
      }
    })
  }

  private checkConnection(): void {
    this.service.testConnection({ sftpClient: this.configuration.sftpClient }).subscribe({
      next: (result) => {
        this.lastTestResult = result
      },
      error: (error) => {
        this.lastTestResult = {
          success: false,
          message: errorMessage(error, 'Connection test failed')
        }
      }
    })
  }

  private loadEvents(): void {
    this.service.getEvents().subscribe({
      next: (events) => {
        this.availableEvents = events
      },
      error: (error) => {
        console.error('Failed to load events:', error)
      }
    })
  }

  isEventSelected(eventId: number): boolean {
    return this.configuration.events.includes(eventId)
  }

  toggleEvent(eventId: number): void {
    const index = this.configuration.events.indexOf(eventId)
    if (index >= 0) {
      this.configuration.events.splice(index, 1)
    } else {
      this.configuration.events.push(eventId)
    }
  }

  save(): void {
    this.isSaving = true
    this.service.updateConfiguration(this.configuration).subscribe({
      next: (configuration) => {
        this.isSaving = false
        this.snackBar.open('Configuration saved successfully', 'Dismiss', {
          duration: 3000,
          panelClass: ['success-snackbar']
        })
        this.configuration = configuration
        this.originalConfiguration = JSON.stringify(configuration)
        if (this.configuration.enabled && this.configuration.sftpClient.host) {
          this.checkConnection()
        }
      },
      error: (error) => {
        this.isSaving = false
        this.snackBar.open(errorMessage(error, 'Failed to save configuration'), 'Dismiss', {
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
          message: errorMessage(error, 'Connection test failed')
        }
        this.snackBar.open(this.lastTestResult.message, 'Dismiss', {
          duration: 8000,
          panelClass: ['error-snackbar']
        })
      }
    })
  }

  toggleKeyInput(): void {
    this.showKeyInput = !this.showKeyInput
    if (!this.showKeyInput) {
      this.privateKeyText = ''
    }
  }

  savePrivateKey(): void {
    if (!this.privateKeyText.trim()) return

    this.isSavingKey = true
    this.service.savePrivateKey(this.privateKeyText).subscribe({
      next: () => {
        this.isSavingKey = false
        this.hasPrivateKey = true
        this.showKeyInput = false
        this.privateKeyText = ''
        this.snackBar.open('Private key saved successfully', 'Dismiss', {
          duration: 3000,
          panelClass: ['success-snackbar']
        })
      },
      error: (error) => {
        this.isSavingKey = false
        this.snackBar.open(errorMessage(error, 'Failed to save private key'), 'Dismiss', {
          duration: 5000,
          panelClass: ['error-snackbar']
        })
      }
    })
  }

  resetToDefaults(): void {
    const dialogRef = this.dialog.open(ResetConfirmDialogComponent, {
      width: '600px'
    })

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return

      this.isResetting = true
      this.service.resetConfiguration().subscribe({
        next: (configuration) => {
          this.isResetting = false
          this.hasPrivateKey = Boolean((configuration as any).hasPrivateKey)
          this.configuration = configuration
          this.originalConfiguration = JSON.stringify(configuration)
          this.lastTestResult = null
          this.snackBar.open('Plugin has been reset to default settings', 'Dismiss', {
            duration: 3000,
            panelClass: ['success-snackbar']
          })
        },
        error: (error) => {
          this.isResetting = false
          this.snackBar.open(errorMessage(error, 'Failed to reset plugin'), 'Dismiss', {
            duration: 5000,
            panelClass: ['error-snackbar']
          })
        }
      })
    })
  }
}
