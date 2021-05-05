import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapClipComponent } from './clip.component';

describe('MapClipComponent', () => {
  let component: MapClipComponent;
  let fixture: ComponentFixture<MapClipComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MapClipComponent]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapClipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
