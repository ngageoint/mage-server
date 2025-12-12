import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AttachUploadComponent } from './attachment-upload.component';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list'; // for mat-nav-list

describe('AttachUploadComponent', () => {
  let component: AttachUploadComponent;
  let fixture: ComponentFixture<AttachUploadComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        CommonModule,
        MatPaginatorModule,
        MatIconModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatListModule
      ],
      declarations: [AttachUploadComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AttachUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
