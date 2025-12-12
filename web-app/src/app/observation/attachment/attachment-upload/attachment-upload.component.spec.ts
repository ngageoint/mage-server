import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AttachUploadComponent } from './attachment-upload.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

describe('AttachUploadComponent', () => {
  let component: AttachUploadComponent;
  let fixture: ComponentFixture<AttachUploadComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatProgressSpinnerModule],
      declarations: [AttachUploadComponent]
    })
    .compileComponents();
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
