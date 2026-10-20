import { Component } from '@angular/core';
import { Api } from '../api/api.entity';
import { ApiService } from 'mage-web-app/api/api.service';
import { Router } from '@angular/router';

@Component({
    selector: 'landing',
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.scss'],
    standalone: false
})
export class LandingComponent {
  api: Api
  contactEmailLink: string | undefined
  contactPhoneLink: string | undefined

  constructor(
    apiService: ApiService,
    private router: Router
  ) {
    apiService.getApi().subscribe((api: Api) => {
      this.api = api

      const { email, phone } = api.contactInfo ?? {}
      this.contactEmailLink = email ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Mage sign-in help')}` : undefined
      this.contactPhoneLink = phone ? `tel:${phone}` : undefined
    })
  }

  onIngress(): void {
    this.router.navigate(['home'])
  }

}
