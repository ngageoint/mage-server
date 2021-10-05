import { Component, Input, OnInit } from '@angular/core';
import { Strategy } from '../../admin-authentication/admin-settings.model';

@Component({
  selector: 'admin-authentication-oauth2',
  templateUrl: './admin-authentication-oauth2.component.html',
  styleUrls: ['./admin-authentication-oauth2.component.scss']
})
//https://datatracker.ietf.org/doc/html/rfc6749
export class AdminAuthenticationOAuth2Component implements OnInit {

  @Input() strategy: Strategy
  @Input() editable = true

  ngOnInit(): void {
    if (!this.strategy.settings.headers) {
      this.strategy.settings.headers = {};
    }

    if (!this.strategy.settings.profile) {
      this.strategy.settings.profile = {};
    }
    if (!this.strategy.settings.profile.id) {
      this.strategy.settings.profile.id = 'ID';
    }
    if (!this.strategy.settings.profile.scope) {
      this.strategy.settings.profile.scope = ['UserProfile.me'];
    }
  }
}
