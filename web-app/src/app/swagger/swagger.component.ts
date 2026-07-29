import { AfterViewInit, Component, ElementRef } from '@angular/core';
import { SessionService } from '../http/session.service';
import SwaggerUI from 'swagger-ui';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

const DisableAuthorizePlugin = function () {
  return {
    wrapComponents: {
      AuthorizeBtnContainer: () => () => null,
      ServersContainer: () => () => null,
      authorizeOperationBtn: () => () => null
    }
  };
};

@Component({
    selector: 'swagger',
    templateUrl: './swagger.component.html',
    styleUrls: ['./swagger.component.scss'],
    standalone: false
})
export class SwaggerComponent implements AfterViewInit {

  constructor(
    private el: ElementRef,
    private location: Location,
    private router: Router,
    private sessionService: SessionService
  ) {
  }

  ngAfterViewInit() {
    SwaggerUI({
      url: '/api/docs/openapi.yaml',
      domNode: this.el.nativeElement.querySelector('.swagger-container'),
      deepLinking: false,
      plugins: [DisableAuthorizePlugin],
      requestInterceptor: (request) => {
        request.headers['Authorization'] = `Bearer ${this.sessionService.getToken()}`
        return request
      },
    });
  }

  onBack() : void {
    if (window.history.state?.navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigate(['home']);
    }
  }
}