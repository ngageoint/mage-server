import { Component, OnInit } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    standalone: false
})
export class AboutComponent implements OnInit {
  apiVersion: {
    major: number,
    minor: number,
    patch: number
  }
  serverVersion: string
  apk: string
  nodeVersion: string
  mongoVersion: string
  adminPhone: string = null;
  adminEmail: string = null;
  showDevContact: boolean = false;

  constructor(
    private location: Location,
    private router: Router,
    public apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.apiService.getApi().subscribe(api =>{
      this.apiVersion = api?.version;
      this.serverVersion = api?.serverVersion;
      this.apk = api?.apk;
      this.nodeVersion = api.environment?.nodeVersion;
      this.mongoVersion = api.environment?.mongodbVersion;
      if (api.contactInfo) {
        this.adminEmail = api.contactInfo?.email ?? null;
        this.adminPhone = api.contactInfo?.phone ?? null;
        this.showDevContact = api.contactInfo?.showDevContact ?? false;
      }
    })
  }

  onBack(): void {
    if (window.history.state?.navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigate(['home']);
    }
  }
}
