import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ArcLayerDeleteDialogComponent } from './arc-layer-delete-dialog.component';

describe('Arc Layer Delete Dialog', () => {
  let component: ArcLayerDeleteDialogComponent;
  let fixture: ComponentFixture<ArcLayerDeleteDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ArcLayerDeleteDialogComponent],
      imports: [HttpClientTestingModule],
      providers: [{
        provide: MatDialogRef,
        useValue: {}
      },]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ArcLayerDeleteDialogComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});