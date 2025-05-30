import { Component, Inject, OnInit } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Router } from '@angular/router';

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

  constructor(
    private router: Router,
    @Inject(ApiService) public apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.apiService.getApi().subscribe(api =>{
      this.mageVersion = api.version;
      this.apk = api.apk;
      this.nodeVersion = api.environment.nodeVersion;
      this.mongoVersion = api.environment.mongodbVersion;
    })
  }

  onBack(): void {
    this.router.navigate(['home']);
  }
}
