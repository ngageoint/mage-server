import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LayersControlComponent } from './layers-control.component';
import { MatIconModule } from '@angular/material/icon';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('LayersControlComponent', () => {
  let component: LayersControlComponent;
  let fixture: ComponentFixture<LayersControlComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ NoopAnimationsModule, MatIconModule ],
      declarations: [ LayersControlComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LayersControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
