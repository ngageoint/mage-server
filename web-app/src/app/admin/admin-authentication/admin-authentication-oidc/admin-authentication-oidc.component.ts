import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';

@Component({
  selector: 'admin-authentication-oidc',
  templateUrl: './admin-authentication-oidc.component.html',
  styleUrls: ['./admin-authentication-oidc.component.scss']
})
export class AdminAuthenticationOidcComponent implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true
  @Output() strategyDirty = new EventEmitter<boolean>();

  ngOnInit(): void {
    if (!this.strategy.settings.scope) {
      this.strategy.settings.scope = ['openid'];
    }
    if (!this.strategy.settings.scope.includes('openid')) {
      this.strategy.settings.scope.push('openid');
    }

    if (!this.strategy.settings.profile) {
      this.strategy.settings.profile = {};
    }
  }

  setDirty(isDirty: boolean): void {
    this.strategy.isDirty = isDirty;
    this.strategyDirty.emit(isDirty);
  }
}
