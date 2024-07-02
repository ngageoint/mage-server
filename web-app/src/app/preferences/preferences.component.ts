import { Component, OnInit } from '@angular/core';
import { UserService } from '../user/user.service';
import { Router } from '@angular/router';

@Component({
  selector: 'preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements OnInit  {
  user: any

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.user = this.userService.myself
  }

  onAbout(): void {
    this.router.navigate(['about']);
  }

  onLogout(): void {
    this.userService.logout()
  }

  onProfile(): void {
    this.router.navigate(['profile']);
  }
}