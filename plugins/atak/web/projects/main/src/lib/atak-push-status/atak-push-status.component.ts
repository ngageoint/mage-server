import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AtakPushStatusService, AtakPushStatus, MageEventSummary } from '../atak-push-status.service';

@Component({
  standalone: false,
  selector: 'atak-push-status',
  templateUrl: './atak-push-status.component.html',
  styleUrls: ['./atak-push-status.component.scss']
})
export class AtakPushStatusComponent implements OnInit {

  events: MageEventSummary[] = [];
  selectedEventId: number | undefined;

  status: AtakPushStatus | null = null;
  isLoading = false;
  isSaving = false;

  constructor(private service: AtakPushStatusService) { }

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

  private applyToggle(enabled: boolean, save: (eventId: number, enabled: boolean) => Observable<AtakPushStatus>): void {
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
