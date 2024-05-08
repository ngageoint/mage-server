import { TestBed, waitForAsync } from '@angular/core/testing';
import { LocalComponent } from './local.component';

describe('LocalComponent', () => {
  let component: LocalComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [LocalComponent]
    })
    .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
