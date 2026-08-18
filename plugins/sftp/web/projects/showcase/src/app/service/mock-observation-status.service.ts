import { ObservationStatusApi } from 'projects/main/src/lib/observation-status/observation-status.service'
import { EventObservationSummary, ObservationStatusResponse, SftpObservationRecord } from 'projects/main/src/lib/entities/entities.format'
import { Observable, of } from 'rxjs'

const MOCK_SUMMARIES: EventObservationSummary[] = [
  {
    eventId: 1,
    eventName: 'Wildfire Watch',
    counts: { SUCCESS: 482, FAILED: 3, PENDING: 12, SKIPPED: 0 },
    stuckPendingCount: 5
  },
  {
    eventId: 2,
    eventName: 'Flood Response',
    counts: { SUCCESS: 210, FAILED: 0, PENDING: 0, SKIPPED: 0 },
    stuckPendingCount: 0
  },
  {
    eventId: 3,
    eventName: 'Storm Recon',
    counts: { SUCCESS: 56, FAILED: 0, PENDING: 2, SKIPPED: 0 },
    stuckPendingCount: 0
  },
  {
    eventId: 4,
    eventName: 'Border Patrol Alpha',
    counts: { SUCCESS: 12, FAILED: 8, PENDING: 4, SKIPPED: 1 },
    stuckPendingCount: 2
  },
  {
    eventId: 5,
    eventName: 'Coastal Watch',
    counts: { SUCCESS: 300, FAILED: 0, PENDING: 0, SKIPPED: 5 },
    stuckPendingCount: 0
  },
  {
    eventId: 6,
    eventName: 'Night Ops Bravo',
    counts: { SUCCESS: 5, FAILED: 15, PENDING: 0, SKIPPED: 0 },
    stuckPendingCount: 0
  },
  {
    eventId: 7,
    eventName: 'Search and Rescue',
    counts: { SUCCESS: 90, FAILED: 1, PENDING: 0, SKIPPED: 0 },
    stuckPendingCount: 0
  },
  {
    eventId: 8,
    eventName: 'Training Exercise',
    counts: { SUCCESS: 0, FAILED: 0, PENDING: 20, SKIPPED: 0 },
    stuckPendingCount: 20
  }
]

function buildMockRecords(summary: EventObservationSummary): SftpObservationRecord[] {
  const now = new Date()
  const records: SftpObservationRecord[] = []
  let n = 0

  const push = (status: string, ageMs: number) => {
    n++
    const created = new Date(now.getTime() - ageMs).toISOString()
    records.push({
      eventId: summary.eventId,
      observationId: `mock-${summary.eventId}-${n}`,
      status,
      lastObservationModified: created,
      createdAt: created,
      updatedAt: created
    })
  }

  for (let i = 0; i < Math.min(summary.counts['SUCCESS'], 25); i++) push('SUCCESS', i * 60_000)
  for (let i = 0; i < summary.counts['FAILED']; i++) push('FAILED', i * 300_000)
  for (let i = 0; i < summary.stuckPendingCount; i++) push('PENDING', 30 * 60 * 60 * 1000 + i * 60_000)
  for (let i = 0; i < summary.counts['PENDING'] - summary.stuckPendingCount; i++) push('PENDING', i * 30_000)
  for (let i = 0; i < summary.counts['SKIPPED']; i++) push('SKIPPED', i * 500_000)

  return records
}

export class MockObservationStatusService implements ObservationStatusApi {
  getObservationStatusSummary(): Observable<EventObservationSummary[]> {
    return of(MOCK_SUMMARIES)
  }

  getObservationStatuses(eventId: number, statusFilter?: string[]): Observable<ObservationStatusResponse> {
    const summary = MOCK_SUMMARIES.find(s => s.eventId === eventId)
    if (!summary) {
      return of({ records: [], counts: { SUCCESS: 0, FAILED: 0, PENDING: 0, SKIPPED: 0 } })
    }

    let records = buildMockRecords(summary)
    if (statusFilter?.length) {
      records = records.filter(r => statusFilter.includes(r.status))
    }

    return of({ records, counts: summary.counts })
  }

  requeueObservations(_eventId: number, observationIds: string[]): Observable<{ queued: number }> {
    return of({ queued: observationIds.length })
  }
}
