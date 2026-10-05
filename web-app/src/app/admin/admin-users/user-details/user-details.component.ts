import { Component, OnInit, OnDestroy, computed, effect, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { UserService } from '../../../user/user.service';
import { User } from '../user';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { RouteReuse } from '../../../route-reuse.strategy';

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
  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange;

  readonly user = signal<User | undefined>(undefined);
  readonly error = signal<string | null>(null);
  isEditingUser = false;

  private destroy$ = new Subject<void>();

  readonly breadcrumbs = computed<AdminBreadcrumb[]>(() => [
    { title: 'Users', icon: 'person', route: ['/admin/users'] },
    { title: this.user()?.displayName || 'Unknown User' }
  ]);

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private breadcrumbService: AdminBreadcrumbService
  ) {
    effect(() => this.breadcrumbService.setBreadcrumbs(this.breadcrumbs()));
  }

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.error.set('Missing userId route param');
      return;
    }

    this.userService
      .getUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user.set(user);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Failed to load user');
        }
      });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleEditUser(): void {
    this.error.set(null);
    this.isEditingUser = !this.isEditingUser;
  }

  onUserSaved(updatedUser: User): void {
    this.user.set(updatedUser);
    this.isEditingUser = false;
  }

  onUserChanged(updatedUser: User): void {
    this.user.set(updatedUser);
  }

  onEditCancelled(): void {
    this.isEditingUser = false;
  }
}
