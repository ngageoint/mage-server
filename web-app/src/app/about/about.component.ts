import { Component, Inject, OnInit } from '@angular/core';
import { ApiService } from '../api/api.service';
import {Location} from '@angular/common';

@Component({
  selector: 'about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss', '../../../node_modules/font-awesome/css/font-awesome.min.css']
})
export class AboutComponent implements OnInit {
  mageVersion: {
    major: number,
    minor: number,
    micro: number
  }
  apk: string
  nodeVersion: string
  mongoVersion: string
  adminPhone: string = null;
  adminEmail: string = null;
  showDevContact: boolean = false;

  constructor(
    private _location: Location,
    @Inject(ApiService) public apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.apiService.getApi().subscribe(api =>{
      this.mageVersion = api?.version;
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
    this._location.back();
  }
}
