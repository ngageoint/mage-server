import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerHeaderComponent } from './layer-header.component';

describe('LayerHeaderComponent', () => {
  let component: LayerHeaderComponent;
  let fixture: ComponentFixture<LayerHeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LayerHeaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LayerHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
