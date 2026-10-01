import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSelectChange as MatSelectChange } from '@angular/material/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PollingService } from '../../event/polling.service';

interface PollingOption {
  title: string
  interval: number
}

@Component({
    selector: 'polling-interval',
    templateUrl: './polling-interval.component.html',
    styleUrls: ['./polling-interval.component.scss'],
    standalone: false
})
export class PollingIntervalComponent implements OnInit, OnDestroy {
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

  private destroy$ = new Subject<void>();

  constructor(
    private pollingService: PollingService
  ) { }

  ngOnInit(): void {
    this.pollingService.pollingInterval$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(interval => {
      this.pollingOption = this.pollingOptions.find((option: PollingOption) => option.interval === interval)
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updatePollingInterval(change: MatSelectChange) {
    this.pollingService.setPollingInterval(change.value.interval)
  }

  public compareOption = function (option: Pick<PollingOption, 'interval'> | null, value: Pick<PollingOption, 'interval'> | null): boolean {
    return option?.interval === value?.interval
  }
}
