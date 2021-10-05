import { Component, Input } from '@angular/core';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-oidc',
  templateUrl: './admin-authentication-oidc.component.html',
  styleUrls: ['./admin-authentication-oidc.component.scss']
})
export class AdminAuthenticationOidcComponent {

  @Input() strategy: Strategy
  @Input() editable = true
}
