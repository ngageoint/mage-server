import { TestBed, waitForAsync } from '@angular/core/testing';
import { DisclaimerComponent } from './disclaimer.component';

describe('Disclaimer Component', () => {
  let component: DisclaimerComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [DisclaimerComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
