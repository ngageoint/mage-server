import { Component, Input, OnInit } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';

@Component({
  selector: 'admin-authentication-saml',
  templateUrl: './admin-authentication-saml.component.html',
  styleUrls: ['./admin-authentication-saml.component.scss']
})
export class AdminAuthenticationSAMLComponent implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true

  ngOnInit(): void {
    if (!this.strategy.settings.headers) {
      this.strategy.settings.headers = {};
    }

    if (!this.strategy.settings.profile) {
      this.strategy.settings.profile = {};
    }

    if (!this.strategy.settings.options) {
      this.strategy.settings.options = {};
    }
  }
}
