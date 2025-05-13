import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserAvatarComponent } from './user-avatar.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [
    UserAvatarComponent
  ],
  imports: [
    CommonModule,
    MatIconModule
  ],
  exports: [ UserAvatarComponent ]
})
export class UserAvatarModule { }