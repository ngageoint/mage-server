import { TestBed, waitForAsync } from '@angular/core/testing';
import { IngressComponent } from './ingress.component';

describe('AuthenticationComponent', () => {
  let component: IngressComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [IngressComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
