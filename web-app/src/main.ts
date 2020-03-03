import 'hammerjs';
import 'angular';

import { enableProdMode, NgZone } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import { UrlService } from '@uirouter/core';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .then(platformRef => {
    // get() UrlService from DI (this call will create all the UIRouter services)
    const url: UrlService = platformRef.injector.get(UrlService);

    // Instruct UIRouter to listen to URL changes
    function startUIRouter() {
      url.listen();
      url.sync();
    }

    const ngZone: NgZone = platformRef.injector.get(NgZone);
    ngZone.run(startUIRouter);
  })
  .catch(err => console.log(err));