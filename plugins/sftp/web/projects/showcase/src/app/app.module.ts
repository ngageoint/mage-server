import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SFTPModule } from 'projects/main/src/public-api';
import { ConfigurationService } from 'projects/main/src/lib/configuration/configuration.service';
import { MockConfigurationService } from './service/mock-configuration.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    SFTPModule
  ],
  providers: [{
    provide: ConfigurationService,
    useClass: MockConfigurationService
  }],
  bootstrap: [AppComponent]
})
export class AppModule { }
