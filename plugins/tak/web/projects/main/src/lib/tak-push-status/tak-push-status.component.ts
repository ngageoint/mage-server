import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TakPushStatusService, TakPushStatus, MageEventSummary } from '../tak-push-status.service';

@Component({
  standalone: false,
  selector: 'tak-push-status',
  templateUrl: './tak-push-status.component.html',
  styleUrls: ['./tak-push-status.component.scss']
})
export class TakPushStatusComponent implements OnInit {

  events: MageEventSummary[] = [];
  selectedEventId: number | undefined;

  status: TakPushStatus | null = null;
  isLoading = false;
  isSaving = false;

  constructor(private service: TakPushStatusService) { }

  ngOnInit(): void {
    this.service.getEvents().subscribe(events => {
      this.events = [...events].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  onEventChange(): void {
    this.load();
  }

  refresh(): void {
    this.load();
  }

  onToggle(enabled: boolean): void {
    this.applyToggle(enabled, (eventId, value) => this.service.setEnabled(eventId, value));
  }

  onLocationToggle(enabled: boolean): void {
    this.applyToggle(enabled, (eventId, value) => this.service.setLocationSharingEnabled(eventId, value));
  }

  private applyToggle(enabled: boolean, save: (eventId: number, enabled: boolean) => Observable<TakPushStatus>): void {
    if (this.selectedEventId == null) {
      return;
    }
    this.isSaving = true;
    save(this.selectedEventId, enabled).subscribe({
      next: status => {
        this.status = status;
        this.isSaving = false;
      },
      error: () => {
        this.isSaving = false;
        // Reload the real status on failure rather than trusting the
        // optimistic toggle state.
        this.load();
      }
    });
  }

  private load(): void {
    if (this.selectedEventId == null) {
      this.status = null;
      return;
    }
    this.isLoading = true;
    this.service.getStatus(this.selectedEventId).subscribe({
      next: status => {
        this.status = status;
        this.isLoading = false;
      },
      error: () => {
        this.status = null;
        this.isLoading = false;
      }
    });
  }
}
