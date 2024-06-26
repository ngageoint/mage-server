import { TestBed, waitForAsync } from '@angular/core/testing';
import { FilterComponent } from './filter.component';

describe('FilterComponent', () => {
  let component: FilterComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FilterComponent]
    })
      .compileComponents();
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
