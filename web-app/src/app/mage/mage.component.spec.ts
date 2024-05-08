import { TestBed, waitForAsync } from '@angular/core/testing';
import { MageComponent } from './mage.component';

describe('MageComponent', () => {
  let component: MageComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MageComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
