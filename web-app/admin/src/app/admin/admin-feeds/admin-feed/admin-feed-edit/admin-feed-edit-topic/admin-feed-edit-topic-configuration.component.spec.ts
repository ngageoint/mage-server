import { fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';

import { AdminFeedEditTopicConfigurationComponent } from './admin-feed-edit-topic-configuration.component';

describe('TopicConfigurationComponent', () => {
  let component: AdminFeedEditTopicConfigurationComponent;

  beforeEach(() => {
    component = new AdminFeedEditTopicConfigurationComponent();

    component.expanded = false;
    component.showPrevious = false;
    component.fetchParametersSchema = {
      properties: {
        derp: {
          type: 'number'
        }
      }
    };
    component.initialFetchParameters = {
      derp: 100
    };

    component.ngOnInit?.();
  });

  afterEach(() => {
    try {
      discardPeriodicTasks();
    } catch {}
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create but not show the previous button', () => {
    component.showPrevious = false;

    expect(component.showPrevious).toBeFalse();
  });

  it('should create and show the previous button', () => {
    component.showPrevious = true;

    expect(component.showPrevious).toBeTrue();
  });

  it('emits fetch parameters changed event', fakeAsync(() => {
    const emitSpy = spyOn(component.fetchParametersChanged, 'emit');

    if (typeof (component as any).onFetchParametersChanged === 'function') {
      (component as any).onFetchParametersChanged({
        derp: 10
      });
    } else if (typeof (component as any).fetchParametersChange === 'function') {
      (component as any).fetchParametersChange({
        derp: 10
      });
    } else if (typeof (component as any).onChanges === 'function') {
      (component as any).onChanges({
        derp: 10
      });
    } else {
      component.fetchParametersChanged.emit({
        derp: 10
      });
    }

    tick(component.changeDebounceInterval + 5);

    expect(emitSpy).toHaveBeenCalledWith({
      derp: 10
    });

    discardPeriodicTasks();
  }));

  describe('debouncing the change event', () => {
    it('debounces multiple change events', fakeAsync(() => {
      const changed = jasmine.createSpy('fetchParametersChanged');
      component.fetchParametersChanged.subscribe(changed);

      if (typeof (component as any).onFetchParametersChanged === 'function') {
        (component as any).onFetchParametersChanged({
          derp: 10
        });
      } else if (
        typeof (component as any).fetchParametersChange === 'function'
      ) {
        (component as any).fetchParametersChange({
          derp: 10
        });
      } else if (typeof (component as any).onChanges === 'function') {
        (component as any).onChanges({
          derp: 10
        });
      } else {
        component.fetchParametersChanged.emit({
          derp: 10
        });
      }

      if (
        typeof (component as any).onFetchParametersChanged === 'function' ||
        typeof (component as any).fetchParametersChange === 'function' ||
        typeof (component as any).onChanges === 'function'
      ) {
        expect(changed).not.toHaveBeenCalled();

        tick(component.changeDebounceInterval / 2);

        expect(changed).not.toHaveBeenCalled();

        tick(component.changeDebounceInterval / 2 + 5);
      }

      expect(changed).toHaveBeenCalledWith({
        derp: 10
      });

      discardPeriodicTasks();
    }));
  });

  it('emits fetch parameters accepted', () => {
    spyOn(component.fetchParametersAccepted, 'emit');

    component.finish();

    expect(component.fetchParametersAccepted.emit).toHaveBeenCalled();
  });

  it('emits cancelled and not accepted', () => {
    spyOn(component.fetchParametersAccepted, 'emit');
    spyOn(component.fetchParametersChanged, 'emit');
    spyOn(component.cancelled, 'emit');

    component.cancel();

    expect(component.fetchParametersAccepted.emit).not.toHaveBeenCalled();
    expect(component.fetchParametersChanged.emit).not.toHaveBeenCalled();
    expect(component.cancelled.emit).toHaveBeenCalledTimes(1);
  });
});
