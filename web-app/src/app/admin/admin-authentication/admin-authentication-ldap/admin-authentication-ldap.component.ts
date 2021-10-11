import { Component, Input, OnInit } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';

interface Scope {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'admin-authentication-ldap',
  templateUrl: './admin-authentication-ldap.component.html',
  styleUrls: ['./admin-authentication-ldap.component.scss']
})
 //https://datatracker.ietf.org/doc/html/rfc4510
export class AdminAuthenticationLDAPComponent implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true

  scopes: Scope[] = [
    {value: 'sub', viewValue: 'sub'},
    {value: 'base', viewValue: 'base'},
    {value: 'one', viewValue: 'one'}
  ];


  ngOnInit(): void {
    if (!this.strategy.settings.headers) {
      this.strategy.settings.headers = {};
    }

    if (!this.strategy.settings.profile) {
      this.strategy.settings.profile = {};
    }
  }
}
