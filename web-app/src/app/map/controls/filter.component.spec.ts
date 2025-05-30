import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FilterControlComponent } from './filter.component';

describe('Filter Control Component', () => {
  let component: FilterControlComponent;
  let fixture: ComponentFixture<FilterControlComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ MatIconModule, MatButtonModule ],
      declarations: [ FilterControlComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilterControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
