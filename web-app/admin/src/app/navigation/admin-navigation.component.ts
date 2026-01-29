import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';

import { AdminUserService } from '../admin/services/admin-user.service';
import { LocalStorageService } from '../../../../../web-app/src/app/http/local-storage.service';

@Component({
  selector: 'admin-navigation',
  templateUrl: './admin-navigation.component.html',
  styleUrls: ['./admin-navigation.component.scss']
})
export class AdminNavigationComponent implements OnInit, OnDestroy {
  token: string | null = null;
  myself: any = null;
  amAdmin = false;
  state = '';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private userService: AdminUserService,
    private localStorageService: LocalStorageService
  ) {}

  ngOnInit(): void {
    this.state = this.router.url;

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => (this.state = e.urlAfterRedirects));

    this.token = this.localStorageService.getToken();

    this.userService.myself$.pipe(takeUntil(this.destroy$)).subscribe((u) => {
      this.myself = u;
      this.token = this.localStorageService.getToken();
    });

    this.userService.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAdmin) => (this.amAdmin = isAdmin));

    this.userService
      .checkLoggedInUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.userService.logout().subscribe(() => {
      window.location.href = '/#/landing';
    });
  }
}
