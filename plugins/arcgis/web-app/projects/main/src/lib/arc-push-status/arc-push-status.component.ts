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
  readonly displayedColumns = ['status', 'id', 'lastModified', 'createdAt'];

  totalCount = 0;
  pageIndex = 0;
  readonly pageSizeOptions = [10, 25, 50, 100];
  pageSize = this.pageSizeOptions[1];

  isLoading = false;

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
