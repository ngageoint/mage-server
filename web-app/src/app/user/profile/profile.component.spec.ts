import { TestBed, waitForAsync } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';

describe('Profile Component', () => {
  let component: ProfileComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ProfileComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
