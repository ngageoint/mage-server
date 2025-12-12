import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CoordinateSystemComponent } from './coordinate-system.component';

describe('CoordinateSystemComponent', () => {
  let component: CoordinateSystemComponent;
  let fixture: ComponentFixture<CoordinateSystemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CoordinateSystemComponent],
      imports: []
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
