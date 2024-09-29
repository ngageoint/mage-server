import { AfterViewInit, Component, ElementRef } from '@angular/core';
import { LocalStorageService } from '../http/local-storage.service';
import SwaggerUI from 'swagger-ui';
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
  styleUrls: ['./swagger.component.scss']
})
export class SwaggerComponent implements AfterViewInit {

  constructor(
    private el: ElementRef,
    private router: Router,
    private localStorageService: LocalStorageService
  ) {
  }

  ngAfterViewInit() {
    SwaggerUI({
      url: '/api/docs/openapi.yaml',
      domNode: this.el.nativeElement.querySelector('.swagger-container'),
      deepLinking: false,
      plugins: [DisableAuthorizePlugin],
      requestInterceptor: (request) => {
        request.headers['Authorization'] = `Bearer ${this.localStorageService.getToken()}`
        return request
      },
    });
  }

  onBack() : void {
    this.router.navigate(['about']);
  }
}