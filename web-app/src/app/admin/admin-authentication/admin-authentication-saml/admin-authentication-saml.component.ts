import { Component, Input, OnInit } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';

interface SignatureAlgorithm {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'admin-authentication-saml',
  templateUrl: './admin-authentication-saml.component.html',
  styleUrls: ['./admin-authentication-saml.component.scss']
})
export class AdminAuthenticationSAMLComponent implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true

  signatureAlgorithms: SignatureAlgorithm[] = [
    {value: 'sha1', viewValue: 'SHA-1'},
    {value: 'sha256', viewValue: 'SHA-256'},
    {value: 'sha512', viewValue: 'SHA-512'}
  ];

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
