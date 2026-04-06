import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from './profile.component';
import { UserAvatarModule } from '../user-avatar/user-avatar.module';
import { UserResolver } from '../../ingress/user.resolver';
import { RouterModule, Routes } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';

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
  declarations: [
    ProfileComponent
  ],
  imports: [
    AngularModule,
    UserAvatarModule,
    RouterModule.forChild(routes)
  ],
  exports: [ RouterModule ]
})
export class ProfileModule { }