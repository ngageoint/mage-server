import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayersControlComponent } from './layers-control.component';

describe('LayersComponent', () => {
  let component: LayersControlComponent;
  let fixture: ComponentFixture<LayersControlComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [LayersControlComponent ]
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
