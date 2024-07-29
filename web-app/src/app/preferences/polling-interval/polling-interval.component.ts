import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { PollingService } from 'src/app/event/polling.service';

interface PollingOption {
  title: string
  interval: number
}

@Component({
  selector: 'polling-interval',
  templateUrl: './polling-interval.component.html',
  styleUrls: ['./polling-interval.component.scss']
})
export class PollingIntervalComponent implements OnInit, OnDestroy  {
  pollingOptions: PollingOption[] = [{
    title: '5 Seconds',
    interval: 5000
  }, {
    title: '30 Seconds',
    interval: 30000
  },{
    title: '2 Minutes',
    interval: 120000
  },{
    title: '5 Minutes',
    interval: 300000
  }]
  pollingOption: PollingOption

  constructor(
    private pollingService: PollingService
  ) {
    const pollingInterval = pollingService.getPollingInterval()
    this.pollingOption = this.pollingOptions.find((option: PollingOption) => option.interval === pollingInterval)
  }

  ngOnInit(): void {
    this.pollingService.addListener(this)
  }

  ngOnDestroy(): void {
    this.pollingService.removeListener(this)
  }

  updatePollingInterval(change: MatSelectChange) {
    this.pollingService.setPollingInterval(change.value.interval)
  }

  onPollingIntervalChanged(pollingInterval: number) {
    this.pollingOption = this.pollingOptions.find((option: PollingOption) => option.interval === pollingInterval)
  }

  public compareOption = function (option, value): boolean {
    return option?.interval === value?.interval
  }
}