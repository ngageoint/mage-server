import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';
import { CommonModule } from '@angular/common';
import { AccountLockComponent } from './account-lock/account-lock.component';
import { PasswordPolicyComponent } from './password-policy/password-policy.component';

@Component({
  selector: 'admin-authentication-local',
  standalone: true,
  imports: [
    CommonModule,
    AccountLockComponent,
    PasswordPolicyComponent
  ],
  templateUrl: './admin-authentication-local.component.html',
  styleUrls: ['./admin-authentication-local.component.scss']
})
export class AdminAuthenticationLocalComponent {

  @Input() strategy: Strategy
  @Input() editable = true
  @Output() strategyDirty = new EventEmitter<boolean>();

  onStrategyDirty(isDirty: boolean): void {
    this.strategyDirty.emit(isDirty);
}
}
