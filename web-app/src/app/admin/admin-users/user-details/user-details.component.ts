import { Component, DestroyRef, OnInit, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { UserService } from '../../../user/user.service';
import { User } from '../user';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { RouteReuse } from '../../../route-reuse.strategy';
import { UserDetailsViewComponent } from './user-details-view/user-details-view.component';
import { UserDetailsEditComponent } from './user-details-edit/user-details-edit.component';

@Component({
    selector: 'mage-user-details',
    templateUrl: './user-details.component.html',
    styleUrls: ['./user-details.component.scss'],
    imports: [MatIconModule, UserDetailsEditComponent, UserDetailsViewComponent]
})
export class UserDetailsComponent implements OnInit, OnDestroy {
  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange;

  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly userService: UserService = inject(UserService);
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  readonly userId: string = this.route.snapshot.paramMap.get('userId');

  readonly user = signal<User | undefined>(undefined);
  readonly error = signal<string | null>(null);
  isEditingUser = false;

  readonly breadcrumbs = computed<AdminBreadcrumb[]>(() => [
    { title: 'Users', icon: 'person', route: ['/admin/users'] },
    { title: this.user()?.displayName || 'Unknown User' }
  ]);

  constructor() {
    effect(() => this.breadcrumbService.setBreadcrumbs(this.breadcrumbs()));
  }

  ngOnInit(): void {
    this.userService
      .getUser(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
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
