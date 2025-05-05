import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClientModule } from '@angular/common/http'; 
import { MatDialogModule } from '@angular/material/dialog'; 
import { ArcLayerDeleteDialogComponent } from './arc-layer-delete-dialog.component';
import { ArcService } from '../arc.service'

describe('Arc Layer Delete Dialog', () => {
  let component: ArcLayerDeleteDialogComponent;
  let fixture: ComponentFixture<ArcLayerDeleteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientModule, MatDialogModule], 
      declarations: [ArcLayerDeleteDialogComponent],
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
    fixture = TestBed.createComponent(ArcLayerDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});