import { Component, Inject, OnInit } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  name: string
  mageVersion: {
    major: number,
    minor: number,
    micro: number
  }
  apk: string
  nodeVersion: string
  mongoVersion: string

  constructor(
    private router: Router,
    @Inject(ApiService) public apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.apiService.getApi().subscribe(api =>{
      this.name = api.name;
      this.mageVersion = api.version;
      this.apk = api.apk;
      this.nodeVersion = api.environment.nodeVersion;
      this.mongoVersion = api.environment.mongodbVersion;
    })
  }

  onBack(): void {
    this.router.navigate(['map']);
  }
}
