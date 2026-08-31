import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ArcService, MageEvent, PushedObservation } from '../arc.service';

@Component({
  standalone: false,
  selector: 'arc-push-status',
  templateUrl: './arc-push-status.component.html',
  styleUrls: ['./arc-push-status.component.scss']
})
export class ArcPushStatusComponent implements OnInit {

  events: MageEvent[] = [];
  selectedEventId: number | undefined;

  pushedObservations: PushedObservation[] = [];
  readonly displayedColumns = ['status', 'id', 'location', 'lastModified', 'createdAt'];

  totalCount = 0;
  pageIndex = 0;
  readonly pageSizeOptions = [10, 25, 50, 100];
  pageSize = this.pageSizeOptions[1];

  isLoading = false;

  hoveredRow: PushedObservation | null = null;
  tooltipX = 0;
  tooltipY = 0;

  constructor(private arcService: ArcService) { }

  ngOnInit(): void {
    this.arcService.fetchEvents().subscribe(events => {
      this.events = [...events].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  onEventChange(): void {
    this.pageIndex = 0;
    this.load();
  }

  onPageChange(page: PageEvent): void {
    this.pageIndex = page.pageIndex;
    this.pageSize = page.pageSize;
    this.load();
  }

  refresh(): void {
    this.load();
  }

  // formats an observation's form field values as multi-line text for the row hover tooltip
  fieldsTooltip(row: PushedObservation): string {
    if (!row.fields.length) {
      return 'No form data';
    }
    return row.fields
      .map(form => Object.entries(form)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([name, value]) => `${name}: ${this.formatFieldValue(value)}`)
        .join('\n'))
      .filter(formText => formText.length > 0)
      .join('\n\n') || 'No form data';
  }

  private formatFieldValue(value: unknown): string {
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  // keeps the fields tooltip positioned next to the cursor rather than anchored to the row
  onRowMouseMove(event: MouseEvent): void {
    this.tooltipX = event.clientX;
    this.tooltipY = event.clientY;
  }

  locationDisplay(row: PushedObservation): string {
    if (row.latitude == null || row.longitude == null) {
      return '--';
    }
    return `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`;
  }

  private load(): void {
    if (this.selectedEventId == null) {
      this.pushedObservations = [];
      this.totalCount = 0;
      return;
    }

    this.isLoading = true;
    this.arcService.fetchPushStatus(this.selectedEventId, this.pageIndex, this.pageSize).subscribe({
      next: (page) => {
        this.pushedObservations = page.items;
        this.totalCount = page.totalCount;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to fetch push status:', error);
        this.pushedObservations = [];
        this.totalCount = 0;
        this.isLoading = false;
      }
    });
  }
}
