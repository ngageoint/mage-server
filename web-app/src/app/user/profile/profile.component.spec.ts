import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { UserAvatarModule } from '../user-avatar/user-avatar.module';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

describe('Profile Component', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ProfileComponent],
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatIconModule,
        MatFormFieldModule,
        UserAvatarModule,
        MatCardModule,
        MatToolbarModule
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
