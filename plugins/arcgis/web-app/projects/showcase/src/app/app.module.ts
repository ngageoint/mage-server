import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MageArcModule } from 'projects/main/src/public-api';

import { ArcService } from 'projects/main/src/lib/arc.service';
import { MockArcService } from 'projects/main/src/lib/arc.service.mock';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    MageArcModule,
    BrowserModule,
    BrowserAnimationsModule, // ENABLES ANIMATIONS
    AppRoutingModule
  ],
  providers: [
    {
      provide: ArcService,
      useClass: MockArcService
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
