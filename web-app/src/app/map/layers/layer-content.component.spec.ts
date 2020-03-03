import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LayerContentComponent } from './layer-content.component';

describe('LayerContentComponent', () => {
  let component: LayerContentComponent;
  let fixture: ComponentFixture<LayerContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LayerContentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LayerContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
