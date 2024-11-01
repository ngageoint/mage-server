import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClientModule } from '@angular/common/http'; 
import { MatDialogModule } from '@angular/material/dialog'; 
import { ArcLayerDialogComponent } from './arc-layer-dialog.component';
import { ArcService } from '../arc.service'; 

describe('Arc Layer Dialog', () => {
  let component: ArcLayerDialogComponent;
  let fixture: ComponentFixture<ArcLayerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientModule, MatDialogModule], 
      declarations: [ArcLayerDialogComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: jasmine.createSpy('close')
          }
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {} 
        },
        ArcService 
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ArcLayerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});