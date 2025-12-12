import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FilterControlComponent } from './filter.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';

describe('Filter Control Component', () => {
  let component: FilterControlComponent;
  let fixture: ComponentFixture<FilterControlComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatChipsModule,
        MatSelectModule,
      ],
      declarations: [FilterControlComponent]
    }).compileComponents();
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
