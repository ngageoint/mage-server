import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from './profile.component';
import { UserAvatarModule } from '../user-avatar/user-avatar.module';
import { UserResolver } from '../../ingress/user.resolver';
import { RouterModule, Routes } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatProgressBarModule as MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';

const routes: Routes = [{
  path: '',
  component: ProfileComponent,
  resolve: {
    user: UserResolver
  }
}];

@NgModule({
  declarations: [],
  imports: [],
  exports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatToolbarModule,
    ReactiveFormsModule
  ]
})
class AngularModule { }

@NgModule({
  imports: [
    AngularModule,
    UserAvatarModule,
    ProfileComponent,
    RouterModule.forChild(routes)
  ],
  exports: [ RouterModule ]
})
export class ProfileModule { }