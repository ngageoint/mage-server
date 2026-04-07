import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FilterComponent } from './filter.component';
import { MatDialogModule as MatDialogModule, MatDialogRef as MatDialogRef } from '@angular/material/dialog';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule as MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule as MatChipsModule } from '@angular/material/chips';
import { MatSelectModule as MatSelectModule } from '@angular/material/select';

describe('FilterComponent', () => {
  let component: FilterComponent;
  let fixture: ComponentFixture<FilterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FilterComponent],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatDialogModule,
        MatFormFieldModule,
        MatChipsModule,
        MatSelectModule
      ],
      providers: [{
        provide: MatDialogRef, useValue: {}
      }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilterComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
