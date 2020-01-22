import {AfterViewInit, Component, ElementRef} from '@angular/core';
import SwaggerUI from 'swagger-ui';
import MageAuthPlugin from './mage.auth.plugin.js';

const DisableAuthorizePlugin = function() {
  return {
    wrapComponents: {
      AuthorizeBtnContainer: () => () => null,
      ServersContainer: () => () => null,
      authorizeOperationBtn: () => () => null
    }
  };
};

function MageAuthorizePlugin(system) {
  return new MageAuthPlugin(system);
};

@Component({
  selector: 'app-swagger',
  templateUrl: './swagger.component.html',
  styleUrls: ['./swagger.component.scss']
})
export class SwaggerComponent implements AfterViewInit {

  constructor(private el: ElementRef) {
  }

  ngAfterViewInit() {
    SwaggerUI({
      url: '/api/docs/openapi.yaml',
      domNode: this.el.nativeElement.querySelector('.swagger-container'),
      deepLinking: false,
      plugins: [MageAuthorizePlugin, DisableAuthorizePlugin]
    });
  }
}
