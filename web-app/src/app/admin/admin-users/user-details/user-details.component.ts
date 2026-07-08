import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, Subject, takeUntil } from 'rxjs';

import { UserService } from '../../../user/user.service';
import { User } from '../user';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';

@Component({
    selector: 'mage-user-details',
    templateUrl: './user-details.component.html',
    styleUrls: ['./user-details.component.scss'],
    standalone: false
})
/**
 * Admin component for viewing and managing a user's details, teams, events, devices, logins, and credentials.
 */
export class UserDetailsComponent implements OnInit, OnDestroy {
  user?: User;
  error: string | null = null;
  isEditingUser = false;

  private destroy$ = new Subject<void>();

  get breadcrumbs(): AdminBreadcrumb[] {
    return [
      { title: 'Users', icon: 'person', route: ['../'] },
      { title: this.user?.displayName || 'Unknown User' }
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((pm) => pm.get('userId')),
        takeUntil(this.destroy$)
      )
      .subscribe((userId) => {
        if (!userId) {
          this.error = 'Missing userId route param';
          return;
        }
        this.initForUser(userId);
      });
  }

  private initForUser(userId: string): void {
    this.error = null;
    this.user = undefined;

    this.userService
      .getUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user = user;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to load user';
        }
      });
  }

  toggleEditUser(): void {
    this.error = null;
    this.isEditingUser = !this.isEditingUser;
  }

  onUserSaved(updatedUser: User): void {
    this.user = updatedUser;
    this.isEditingUser = false;
  }

  onUserChanged(updatedUser: User): void {
    this.user = updatedUser;
  }

  onEditCancelled(): void {
    this.isEditingUser = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
