import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoomComponent, ZoomDirection } from './zoom.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { By } from '@angular/platform-browser';

describe('ZoomComponent', () => {
  let component: ZoomComponent;
  let fixture: ComponentFixture<ZoomComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ MatIconModule, MatButtonModule ],
      declarations: [ ZoomComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ZoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit zoom in', () => {
    spyOn(component.onZoom, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[0];
    button.nativeElement.click();

    expect(component.onZoom.emit).toHaveBeenCalledWith({
      direction: ZoomDirection.IN
    });
  });

  it('should emit zoom out', () => {
    spyOn(component.onZoom, 'emit');

    const button = fixture.debugElement.queryAll(By.css('button'))[1];
    button.nativeElement.click();

    expect(component.onZoom.emit).toHaveBeenCalledWith({
      direction: ZoomDirection.OUT
    });
  });
});
