import { Component, OnInit, input, output } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
    selector: 'admin-authentication-oidc',
    templateUrl: './admin-authentication-oidc.component.html',
    styleUrls: ['./admin-authentication-oidc.component.scss'],
    imports: [
      MatFormFieldModule,
      FormsModule,
      MatInputModule,
      MatExpansionModule
    ]
})
export class AdminAuthenticationOidcComponent implements OnInit {

  readonly strategy = input.required<Strategy>();
  readonly editable = input(true);
  readonly strategyDirty = output<boolean>();

  ngOnInit(): void {
    if (!this.strategy().settings.scope) {
      this.strategy().settings.scope = ['openid'];
    }
    if (!this.strategy().settings.scope.includes('openid')) {
      this.strategy().settings.scope.push('openid');
    }

    if (!this.strategy().settings.profile) {
      this.strategy().settings.profile = {};
    }
  }

  setDirty(isDirty: boolean): void {
    this.strategy().isDirty = isDirty;
    this.strategyDirty.emit(isDirty);
  }
}
