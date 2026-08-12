import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import moment from 'moment';
import { SessionService } from '../../http/session.service';
import { Export, ExportStatus } from '../entities.export';

@Component({
  selector: 'export-list-item',
  templateUrl: 'export-list-item.component.html',
  styleUrls: ['./export-list-item.component.scss'],
  standalone: false
})
export class ExportListItemComponent implements OnChanges {
  @Input() item: Export

  exportStatus = ExportStatus
  token: string
  summaryStart: number
  summaryEnd: number

  constructor(sessionService: SessionService) {
    this.token = sessionService.getToken()
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.item) {
      const observationStart = moment(this.item.summary?.observations?.startTimestamp || null)
      const observationEnd = moment(this.item.summary?.observations?.endTimestamp || null)
      const locationStart = moment(this.item.summary?.locations?.startTimestamp || null)
      const locationEnd = moment(this.item.summary?.locations?.endTimeStamp || null)

      this.summaryStart = this.compare(
        observationStart.isValid() ? observationStart.valueOf() : null,
        locationStart.isValid() ? locationStart.valueOf() : null,
        Math.min
      )

      this.summaryEnd = this.compare(
        observationEnd.isValid() ? observationEnd.valueOf() : null,
        locationEnd.isValid() ? locationEnd.valueOf() : null,
        Math.max
      )
    }
  }

  compare(timestamp1: number | null, timestamp2: number | null, operator: (t1: number, t2: number) => number): number | null {
    if (timestamp1 == null && timestamp2 == null) return null
    if (timestamp1 == null) return timestamp2
    if (timestamp2 == null) return timestamp1

    return operator(timestamp1, timestamp2)
  }
}
