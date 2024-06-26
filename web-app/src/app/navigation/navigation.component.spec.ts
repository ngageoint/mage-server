import { TestBed, waitForAsync } from '@angular/core/testing';
import { NavigationComponent } from './navigation.component';

describe('Navigation Component', () => {
  let component: NavigationComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [NavigationComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
