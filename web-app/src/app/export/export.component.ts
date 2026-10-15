import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { ExportService } from './export.service';
import { Observable, Subscription, timer } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

export enum ViewState { List, Create }

@Component({
  selector: 'export',
  templateUrl: 'export.component.html',
  styleUrls: ['./export.component.scss'],
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('250ms', style({ opacity: 0 })),
      ])
    ])
  ],
  standalone: false
})
export class ExportComponent implements OnInit, OnDestroy {

  viewState = ViewState
  state: { view: ViewState, count?: number } = { view: ViewState.List, count: 0 }

  refreshTimer$: Observable<number> = timer(0, 5000)
  refreshTimerSubscription: Subscription
  exportsSubscription: Subscription

  constructor(
    @Inject(ExportService) public exportService: ExportService
  ) { }

  ngOnInit(): void {
    this.refreshTimerSubscription = this.refreshTimer$.subscribe(() => {
      this.exportService.fetchExports().subscribe()
    })

    this.exportsSubscription = this.exportService.exports$.subscribe({
      next: (exports) => {
        this.state.count = exports.length
      }
    })
  }

  ngOnDestroy(): void {
    this.refreshTimerSubscription?.unsubscribe()
    this.exportsSubscription?.unsubscribe()
  }

  onCreate(): void {
    this.state.view = ViewState.Create
  }

  onCreateClose(): void {
    this.state.view = ViewState.List
  }

}
