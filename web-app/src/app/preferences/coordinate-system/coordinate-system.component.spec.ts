import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CoordinateSystemComponent } from './coordinate-system.component';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('CoordinateSystemComponent', () => {
  let component: CoordinateSystemComponent;
  let fixture: ComponentFixture<CoordinateSystemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CoordinateSystemComponent],
      imports: [
        MatSelectModule,
        MatIconModule,
        MatFormFieldModule,
        BrowserAnimationsModule
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CoordinateSystemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
