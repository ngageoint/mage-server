import { TestBed, waitForAsync } from '@angular/core/testing';
import { HomeComponent } from './home.component';

describe('MageComponent', () => {
  let component: HomeComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [HomeComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
