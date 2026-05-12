import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

import { AdminUserService } from '../admin/services/admin-user.service';
import { User } from '../admin/admin-users/user';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BannerComponent } from '../banner/banner.component';
import { AdminNavigationComponent } from '../navigation/admin-navigation.component';

@Component({
  selector: 'bootstrap',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BannerComponent,
    AdminNavigationComponent
  ],

  templateUrl: './bootstrap.component.html',
  styleUrls: ['./bootstrap.component.scss']
})
export class BootstrapComponent implements OnInit, OnDestroy {
  myself: User | null = null;

  private destroy$ = new Subject<void>();

  constructor(private adminUserService: AdminUserService) {}

  ngOnInit(): void {
    this.adminUserService
      .checkLoggedInUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.adminUserService.myself$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => (this.myself = user));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
