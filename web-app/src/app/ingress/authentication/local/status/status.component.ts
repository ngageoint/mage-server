import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

@Component({
  selector: 'account-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss']
})
export class StatusComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  icon: string
  color: string
  title: string
  message: string

  ngOnInit() {
    this.route.queryParams.subscribe((params: Params) => {
      if (params.active === "true") {
        this.icon = "check_circle"
        this.color = "#4CAF50"
        this.title = "Account Created"
        this.message = "Your account has been successfully created."
      } else {
        this.icon = "preliminary"
        this.color = "#FFA000"
        this.title = "Account Pending"
        this.message = "Your account has been successfully created. A Mage administrator will need to activate your account before you can log in."
      }
    })
  }

  onDone(): void {
    this.router.navigate(['landing'])
  }
}