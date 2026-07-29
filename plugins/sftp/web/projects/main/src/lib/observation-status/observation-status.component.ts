import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ObservationStatusService } from './observation-status.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { MageEventSummary, SftpObservationRecord } from '../entities/entities.format';

const ALL_STATUSES = ['SUCCESS', 'FAILED', 'PENDING', 'SKIPPED']

@Component({
  standalone: false,
  selector: 'sftp-observation-status',
  templateUrl: './observation-status.component.html',
  styleUrls: ['./observation-status.component.scss']
})
export class ObservationStatusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>()

  events: MageEventSummary[] = []
  selectedEventId: number | null = null

  allRecords: SftpObservationRecord[] = []
  filteredRecords: SftpObservationRecord[] = []
  counts: Record<string, number> = { SUCCESS: 0, FAILED: 0, PENDING: 0, SKIPPED: 0 }

  activeFilters: Set<string> = new Set()
  readonly statuses = ALL_STATUSES
  readonly displayedColumns = ['status', 'observationId', 'lastModified', 'syncedAt', 'action']

  isLoading = false
  syncingIds = new Set<string>()

  constructor(
    private statusService: ObservationStatusService,
    private configService: ConfigurationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.configService.getEvents().pipe(takeUntil(this.destroy$)).subscribe(events => {
      this.events = events
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  onEventChange(): void {
    this.activeFilters.clear()
    this.loadStatuses()
  }

  toggleFilter(status: string): void {
    if (this.activeFilters.has(status)) {
      this.activeFilters.delete(status)
    } else {
      this.activeFilters.add(status)
    }
    this.applyFilter()
  }

  isFilterActive(status: string): boolean {
    return this.activeFilters.has(status)
  }

  refresh(): void {
    this.loadStatuses()
  }

  syncOne(record: SftpObservationRecord): void {
    if (!this.selectedEventId) return
    this.syncingIds.add(record.observationId)
    this.statusService.requeueObservations(this.selectedEventId, [record.observationId])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.syncingIds.delete(record.observationId)
        this.snackBar.open('Observation queued for sync', undefined, { duration: 3000 })
        this.loadStatuses()
      })
  }

  syncAllFailed(): void {
    this.syncByStatus('FAILED')
  }

  syncAllSkipped(): void {
    this.syncByStatus('SKIPPED')
  }

  isSyncing(record: SftpObservationRecord): boolean {
    return this.syncingIds.has(record.observationId)
  }

  truncateId(id: string): string {
    return id.length > 8 ? id.slice(0, 8) + '…' : id
  }

  private loadStatuses(): void {
    if (!this.selectedEventId) return
    this.isLoading = true
    this.statusService.getObservationStatuses(this.selectedEventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.allRecords = response.records
        this.counts = { SUCCESS: 0, FAILED: 0, PENDING: 0, SKIPPED: 0, ...response.counts }
        this.applyFilter()
        this.isLoading = false
      })
  }

  applyFilter(): void {
    if (this.activeFilters.size === 0) {
      this.filteredRecords = [...this.allRecords]
    } else {
      this.filteredRecords = this.allRecords.filter(r => this.activeFilters.has(r.status))
    }
  }

  private syncByStatus(status: string): void {
    if (!this.selectedEventId) return
    const ids = this.allRecords.filter(r => r.status === status).map(r => r.observationId)
    if (!ids.length) return
    this.statusService.requeueObservations(this.selectedEventId, ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.snackBar.open(`${result.queued} observation(s) queued for sync`, undefined, { duration: 3000 })
        this.loadStatuses()
      })
  }
}
