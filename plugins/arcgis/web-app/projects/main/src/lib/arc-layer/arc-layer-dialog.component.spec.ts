import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { ArcLayerDialogComponent } from './arc-layer-dialog.component';

describe('Arc Layer Dialog', () => {
  let component: ArcLayerDialogComponent;
  let fixture: ComponentFixture<ArcLayerDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ArcLayerDialogComponent],
      imports: [HttpClientTestingModule],
      providers: [{
        provide: MatDialogRef,
        useValue: {}
      },]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ArcLayerDialogComponent);
    component = fixture.componentInstance;
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });
});