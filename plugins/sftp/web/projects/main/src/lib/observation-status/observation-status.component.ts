import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { ObservationStatusService } from './observation-status.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { EventObservationSummary, MageEventSummary, SftpObservationRecord } from '../entities/entities.format';

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

  recordsPageSize = 10
  recordsPageIndex = 0
  pagedRecords: SftpObservationRecord[] = []

  activeFilters: Set<string> = new Set()
  readonly statuses = ALL_STATUSES
  readonly displayedColumns = ['status', 'observationId', 'lastModified', 'syncedAt', 'action']

  isLoading = false
  syncingIds = new Set<string>()

  isSummaryLoading = false
  eventSummaries: EventObservationSummary[] = []
  showAllEvents = false

  pageSize = 10
  pageIndex = 0
  pagedAllEvents: EventObservationSummary[] = []

  get problemEvents(): EventObservationSummary[] {
    return this.eventSummaries
      .filter(s => s.counts['FAILED'] > 0 || s.stuckPendingCount > 0)
      .sort((a, b) => (b.counts['FAILED'] - a.counts['FAILED']) || (b.stuckPendingCount - a.stuckPendingCount))
  }

  rowSeverity(row: EventObservationSummary): 'healthy' | 'pending' | 'failed' {
    if (row.counts['FAILED'] > 0) return 'failed'
    if (row.stuckPendingCount > 0) return 'pending'
    return 'healthy'
  }

  rowIcon(row: EventObservationSummary): string {
    switch (this.rowSeverity(row)) {
      case 'failed': return 'error'
      case 'pending': return 'warning'
      default: return 'check_circle'
    }
  }

  private get allEventsSorted(): EventObservationSummary[] {
    return [...this.eventSummaries].sort((a, b) => a.eventName.localeCompare(b.eventName))
  }

  constructor(
    private statusService: ObservationStatusService,
    private configService: ConfigurationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.configService.getEvents().pipe(takeUntil(this.destroy$)).subscribe(events => {
      this.events = events
    })
    this.loadSummary()
  }

  loadSummary(): void {
    this.isSummaryLoading = true
    this.statusService.getObservationStatusSummary().pipe(takeUntil(this.destroy$)).subscribe(summaries => {
      this.eventSummaries = summaries
      this.pageIndex = 0
      this.updatePagedAllEvents()
      this.isSummaryLoading = false
    })
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex
    this.pageSize = event.pageSize
    this.updatePagedAllEvents()
  }

  private updatePagedAllEvents(): void {
    const start = this.pageIndex * this.pageSize
    this.pagedAllEvents = this.allEventsSorted.slice(start, start + this.pageSize)
  }

  selectEventFromSummary(eventId: number): void {
    this.selectedEventId = eventId
    this.onEventChange()
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
    this.loadSummary()
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
        this.loadSummary()
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
    this.recordsPageIndex = 0
    this.updatePagedRecords()
  }

  onRecordsPageChange(event: PageEvent): void {
    this.recordsPageIndex = event.pageIndex
    this.recordsPageSize = event.pageSize
    this.updatePagedRecords()
  }

  private updatePagedRecords(): void {
    const start = this.recordsPageIndex * this.recordsPageSize
    this.pagedRecords = this.filteredRecords.slice(start, start + this.recordsPageSize)
  }

  private syncByStatus(status: string): void {
    if (!this.selectedEventId) return
    const ids = this.allRecords.filter(r => r.status === status).map(r => r.observationId)
    if (!ids.length) return
    this.statusService.requeueObservations(this.selectedEventId, ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        const noun = result.queued === 1 ? 'observation' : 'observations'
        this.snackBar.open(`${result.queued} ${noun} queued for sync`, undefined, { duration: 3000 })
        this.loadStatuses()
        this.loadSummary()
      })
  }
}
