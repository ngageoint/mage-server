import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AttachUploadComponent } from './attachment-upload.component';

describe('AttachUploadComponent', () => {
  let component: AttachUploadComponent;
  let fixture: ComponentFixture<AttachUploadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AttachUploadComponent ]
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
