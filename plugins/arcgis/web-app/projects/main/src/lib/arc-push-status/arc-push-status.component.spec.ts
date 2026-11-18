import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ArcPushStatusComponent } from './arc-push-status.component';
import { ArcService, apiBaseUrl, baseUrl, PushedLayerCount, PushedObservationsPage } from '../arc.service';

describe('Arc Push Status - layer counts', () => {
  let component: ArcPushStatusComponent;
  let fixture: ComponentFixture<ArcPushStatusComponent>;
  let httpMock: HttpTestingController;

  const layerCount = (layerName: string, count: number): PushedLayerCount => ({
    url: `${layerName}-url`,
    featureServiceUrl: `${layerName}-feature-service-url`,
    layerName,
    count
  });

  const pageWithLayerCounts = (layerCounts: PushedLayerCount[]): PushedObservationsPage => ({
    items: [],
    totalCount: layerCounts.reduce((sum, lc) => sum + lc.count, 0),
    pageIndex: 0,
    pageSize: 25,
    layerCounts
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatSelectModule,
        MatFormFieldModule,
        MatIconModule,
        MatTableModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatTooltipModule
      ],
      declarations: [ArcPushStatusComponent],
      providers: [ArcService, provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ArcPushStatusComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    httpMock.expectOne(req => req.url.startsWith(`${apiBaseUrl}/events`)).flush([{ id: 1, name: 'Event 1', forms: [] }]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function selectEventAndFlush(page: PushedObservationsPage): void {
    component.selectedEventId = 1;
    component.onEventChange();
    httpMock.expectOne(req => req.url.startsWith(`${baseUrl}/pushStatus`)).flush(page);
    fixture.detectChanges();
  }

  describe('isMismatched', () => {
    it('reports no mismatch when there are fewer than two layers', () => {
      component.layerCounts = [layerCount('Layer A', 5)];
      expect(component.isMismatched(5)).toBeFalse();
    });

    it('reports no mismatch when every layer has the same count', () => {
      component.layerCounts = [layerCount('Layer A', 5), layerCount('Layer B', 5), layerCount('Layer C', 5)];
      expect(component.isMismatched(5)).toBeFalse();
    });

    it('flags a layer whose count differs from the majority', () => {
      component.layerCounts = [layerCount('Layer A', 5), layerCount('Layer B', 5), layerCount('Layer C', 3)];
      expect(component.isMismatched(3)).toBeTrue();
      expect(component.isMismatched(5)).toBeFalse();
    });

    it('flags every layer when counts are evenly split with no majority', () => {
      component.layerCounts = [layerCount('Layer A', 5), layerCount('Layer B', 3)];
      const mismatchedCounts = component.layerCounts
        .map(lc => lc.count)
        .filter(count => component.isMismatched(count));
      expect(mismatchedCounts.length).toBe(1);
    });
  });

  describe('rendering the layer count chips', () => {
    it('renders one chip per layer with its name and count', () => {
      selectEventAndFlush(pageWithLayerCounts([layerCount('Layer A', 5), layerCount('Layer B', 5)]));

      const chips: HTMLElement[] = fixture.nativeElement.querySelectorAll('.layer-count-chip');
      expect(chips.length).toBe(2);
      expect(chips[0].textContent).toContain('Layer A: 5');
      expect(chips[1].textContent).toContain('Layer B: 5');
    });

    it('applies the mismatch class only to the chip whose count differs', () => {
      selectEventAndFlush(pageWithLayerCounts([
        layerCount('Layer A', 5),
        layerCount('Layer B', 5),
        layerCount('Layer C', 2)
      ]));

      const chips: HTMLElement[] = fixture.nativeElement.querySelectorAll('.layer-count-chip');
      expect(chips[0].classList.contains('mismatch')).toBeFalse();
      expect(chips[1].classList.contains('mismatch')).toBeFalse();
      expect(chips[2].classList.contains('mismatch')).toBeTrue();
    });

    it('does not render any chips when there are no layer counts', () => {
      selectEventAndFlush(pageWithLayerCounts([]));

      const chips: HTMLElement[] = fixture.nativeElement.querySelectorAll('.layer-count-chip');
      expect(chips.length).toBe(0);
    });
  });
});
