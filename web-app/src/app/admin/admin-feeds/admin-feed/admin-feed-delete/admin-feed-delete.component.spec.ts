import { HttpClientModule } from '@angular/common/http';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AdminFeedDeleteComponent } from './admin-feed-delete.component';


describe('AdminFeedDeleteComponent', () => {
  let component: AdminFeedDeleteComponent;
  let fixture: ComponentFixture<AdminFeedDeleteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule, HttpClientModule],
      providers: [{
        provide: MatDialogRef, useValue: {}
      }, {
        provide: MAT_DIALOG_DATA, useValue:{}
      }],
      declarations: [ AdminFeedDeleteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminFeedDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
