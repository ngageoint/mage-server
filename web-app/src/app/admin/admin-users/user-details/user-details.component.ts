import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, Subject, takeUntil } from 'rxjs';

import { UserService } from '../../../user/user.service';
import { User } from '../user';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';

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
  private _user?: User;
  set user(value: User | undefined) {
    this._user = value;
    this.breadcrumbs = [{ title: 'Users', icon: 'person', route: ['/admin/users'] }, { title: value?.displayName || 'Unknown User' }];
  }
  get user(): User | undefined {
    return this._user;
  }

  error: string | null = null;
  isEditingUser = false;

  private destroy$ = new Subject<void>();

  breadcrumbs: AdminBreadcrumb[] = [{ title: 'Users', icon: 'person', route: ['/admin/users'] }, { title: 'Unknown User' }];

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private breadcrumbService: AdminBreadcrumbService
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

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
    this.destroy$.next();
    this.destroy$.complete();
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
}
