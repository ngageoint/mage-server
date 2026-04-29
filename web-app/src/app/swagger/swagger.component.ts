import { AfterViewInit, Component, ElementRef } from '@angular/core';
import { LocalStorageService } from '../http/local-storage.service';
import SwaggerUI from 'swagger-ui';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

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
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule
  ],
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