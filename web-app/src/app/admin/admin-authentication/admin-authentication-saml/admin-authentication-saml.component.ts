import { Component, Input, OnInit } from '@angular/core';
import { Strategy } from '../../admin-settings/admin-settings.model';

@Component({
  selector: 'admin-authentication-saml',
  templateUrl: './admin-authentication-saml.component.html',
  styleUrls: ['./admin-authentication-saml.component.scss']
})
export class AdminAuthenticationSAMLComponent implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true

  ngOnInit(): void {
    this.strategy.settings.uidAttribute = "uid";
    this.strategy.settings.displayNameAttribute = "email";
    this.strategy.settings.emailAttribute = "email";
    this.strategy.settings.options.callbackPath = '/auth/saml/callback';
  }
}
