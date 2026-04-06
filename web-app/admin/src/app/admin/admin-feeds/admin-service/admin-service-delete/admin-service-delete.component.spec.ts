import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {
  MatLegacyDialogModule as MatDialogModule,
  MatLegacyDialogRef as MatDialogRef,
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA
} from '@angular/material/legacy-dialog';
import { AdminServiceDeleteComponent } from './admin-service-delete.component';

describe('AdminServiceDeleteComponent', () => {
  let component: AdminServiceDeleteComponent;
  let fixture: ComponentFixture<AdminServiceDeleteComponent>;

  const dialogData = {
    service: {
      id: 'service-1',
      title: 'Example Service',
      summary: 'Example Summary',
      serviceType: 'service-type-1',
      config: {}
    } as any,
    feeds: [
      {
        id: 'feed-1',
        title: 'Example Feed',
        summary: 'Example Feed Summary',
        service: 'service-1'
      } as any
    ]
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ],
      declarations: [AdminServiceDeleteComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminServiceDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set service and feeds from injected data', () => {
    expect(component.service).toEqual(dialogData.service);
    expect(component.feeds).toEqual(dialogData.feeds);
  });
});
