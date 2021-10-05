import { Component, Input, OnInit } from '@angular/core';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-ldap',
  templateUrl: './admin-authentication-ldap.component.html',
  styleUrls: ['./admin-authentication-ldap.component.scss']
})
 //https://datatracker.ietf.org/doc/html/rfc4510
export class AdminAuthenticationLDAPComponent implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true

  ngOnInit(): void {
    this.strategy.settings.ldapUsernameField = "cn";
    this.strategy.settings.ldapDisplayNameField = "givenname";
    this.strategy.settings.ldapEmailField = "mail";
  }
}
