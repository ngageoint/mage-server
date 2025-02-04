import { Injectable } from "@angular/core";
import { LocalStorageService } from "../http/local-storage.service";
import * as _ from 'underscore';

@Injectable({
  providedIn: 'root'
})
export class PollingService {

  private listeners = [];
  private pollingInterval: any

  constructor(
    private localStorageService: LocalStorageService
  ) {
    this.pollingInterval = parseInt(localStorageService.getPollingInterval())

    if (!this.pollingInterval || parseInt(this.pollingInterval) === 0 || Number.isNaN(parseInt(this.pollingInterval))) {
      this.pollingInterval = 30000;
    }
  }

  addListener(listener: any) {
    this.listeners.push(listener);

    if (_.isFunction(listener.onPollingIntervalChanged)) {
      listener.onPollingIntervalChanged(this.pollingInterval);
    }
  }

  removeListener(listener: any) {
    this.listeners = _.reject(this.listeners, function (l: any) { return listener === l; });
  }

  setPollingInterval(interval: number) {
    this.pollingInterval = interval;
    this.localStorageService.setPollingInterval(interval);
    _.each(this.listeners, function (listener: any) {
      if (_.isFunction(listener.onPollingIntervalChanged)) {
        listener.onPollingIntervalChanged(interval);
      }
    });
  }

  getPollingInterval() {
    return this.pollingInterval;
  }

}