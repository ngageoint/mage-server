import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';

interface SignatureAlgorithm {
  value: string;
  viewValue: string;
}

interface RACComparison {
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
  @Output() strategyDirty = new EventEmitter<boolean>();

  signatureAlgorithms: SignatureAlgorithm[] = [
    {value: 'sha1', viewValue: 'SHA-1'},
    {value: 'sha256', viewValue: 'SHA-256'},
    {value: 'sha512', viewValue: 'SHA-512'}
  ];
 
  racs: RACComparison[] = [
    {value: 'exact', viewValue: 'Exact'},
    {value: 'minimum', viewValue: 'Minimum'},
    {value: 'maximum', viewValue: 'Maximum'},
    {value: 'better', viewValue: 'Better'}
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

  setDirty(isDirty: boolean): void {
    this.strategy.isDirty = isDirty;
    this.strategyDirty.emit(isDirty);
  }
}
