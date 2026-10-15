import { Component, input, output } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';
import { AccountLockComponent } from './account-lock/account-lock.component';
import { PasswordPolicyComponent } from './password-policy/password-policy.component';

@Component({
    selector: 'admin-authentication-local',
    templateUrl: './admin-authentication-local.component.html',
    styleUrls: ['./admin-authentication-local.component.scss'],
    imports: [
      AccountLockComponent,
      PasswordPolicyComponent
    ]
})
export class AdminAuthenticationLocalComponent {

  readonly strategy = input.required<Strategy>();
  readonly strategyDirty = output<boolean>();

  onStrategyDirty(isDirty: boolean): void {
    this.strategyDirty.emit(isDirty);
  }
}
