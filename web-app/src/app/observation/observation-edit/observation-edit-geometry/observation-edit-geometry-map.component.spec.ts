import { ObservationEditGeometryMapComponent } from './observation-edit-geometry-map.component';

describe('ObservationEditGeometryMapComponent', () => {
  let component: ObservationEditGeometryMapComponent;

  beforeEach(() => {
    component = new ObservationEditGeometryMapComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit edit event', () => {
    spyOn(component.onEdit, 'emit');

    component.edit();

    expect(component.onEdit.emit).toHaveBeenCalled();
  });
});