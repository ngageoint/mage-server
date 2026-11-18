import { NgModule } from '@angular/core';
import { UserAvatarComponent } from './user-avatar.component';

@NgModule({
  imports: [
    UserAvatarComponent
  ],
  exports: [ UserAvatarComponent ]
})
export class UserAvatarModule { }