import { Component } from '@angular/core';
import { Api } from '../api/api.entity';
import { ApiService } from 'admin/src/app/api/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {
  api: Api

  constructor(
    apiService: ApiService,
    private router: Router
  ) {
    apiService.getApi().subscribe((api: Api) => {
      this.api = api
    })
  }

  onIngress(): void {
    this.router.navigate(['home'])
  }

}
