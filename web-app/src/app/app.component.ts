import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, switchMap, of, takeUntil } from 'rxjs';
import { Banners, SettingsService } from './settings/settings.service';
import { UserService } from './user/user.service';
import { SessionService } from './http/session.service';

@Component({
    selector: 'app',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  banners?: Banners;

  private destroy$ = new Subject<void>();

  constructor(
    private settingsService: SettingsService,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.sessionService.user$.pipe(
      takeUntil(this.destroy$),
      switchMap(user => user ? this.settingsService.getBanner() : of(undefined))
    ).subscribe(banners => {
      this.banners = banners;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
