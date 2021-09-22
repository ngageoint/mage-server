import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ObservationEvent {
  observation: any;
}

export interface UserEvent {
  user: any;
}

@Injectable({
  providedIn: 'root'
})
export class FeedPanelService {
  private viewUserSource = new Subject<UserEvent>();
  private viewObservationSource = new Subject<ObservationEvent>();

  private editObservationSource = new Subject<ObservationEvent>();

  viewUser$ = this.viewUserSource.asObservable();
  viewObservation$ = this.viewObservationSource.asObservable();

  editObservation$ = this.editObservationSource.asObservable();

  viewObservation(observation: any): void {
    this.viewObservationSource.next({
      observation: observation
    });
  }

  edit(observation: any): void {
    this.editObservationSource.next({
      observation: observation
    });
  }

  viewUser(user: any): void {
    this.viewUserSource.next({
      user: user
    });
  }
}
