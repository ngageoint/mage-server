import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { MageUserModule, UserReadService } from 'core-lib-src/user'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MockUserReadService } from './user/mock-user-read.service'

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MageUserModule,
  ],
  providers: [
    {
      provide: UserReadService,
      useClass: MockUserReadService
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
