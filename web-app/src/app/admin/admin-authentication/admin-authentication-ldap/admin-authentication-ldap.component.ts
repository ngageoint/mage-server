import { Component, Input } from '@angular/core';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-ldap',
  templateUrl: './admin-authentication-ldap.component.html',
  styleUrls: ['./admin-authentication-ldap.component.scss']
})
 //https://datatracker.ietf.org/doc/html/rfc4510
export class AdminAuthenticationLDAPComponent {

  @Input() strategy: Strategy
  @Input() editable = true
}
