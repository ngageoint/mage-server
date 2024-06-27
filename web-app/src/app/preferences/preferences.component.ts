import { Component, OnInit } from '@angular/core';
import { UserService } from '../user/user.service';

@Component({
  selector: 'preferences',
  templateUrl: './preferences.component.html',
  styleUrls: ['./preferences.component.scss']
})
export class PreferencesComponent implements OnInit  {
  user: any

  constructor(
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.user = this.userService.myself
  }
}