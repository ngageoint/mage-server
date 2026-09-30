import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { LocalStorageService } from "../http/local-storage.service";

@Injectable({
  providedIn: 'root'
})
export class PollingService {
  private pollingIntervalSubject: BehaviorSubject<number>;
  readonly pollingInterval$: Observable<number>;

  constructor(private localStorageService: LocalStorageService) {
    let interval = localStorageService.getPollingInterval();
    if (!interval) {
      interval = 30000;
    }
    this.pollingIntervalSubject = new BehaviorSubject<number>(interval);
    this.pollingInterval$ = this.pollingIntervalSubject.asObservable();
  }

  setPollingInterval(interval: number) {
    this.localStorageService.setPollingInterval(interval);
    this.pollingIntervalSubject.next(interval);
  }

  getPollingInterval(): number {
    return this.pollingIntervalSubject.getValue();
  }
}
