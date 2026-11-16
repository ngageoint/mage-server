import {
  Component,
  ElementRef,
  inject,
  input,
  OnChanges,
  output,
  SimpleChanges,
  viewChildren
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import type { Position } from 'geojson';
import { MapService, FeatureEdit } from '../../../map/map.service';
import { GeometryService } from '../../../geometry/geometry.service';
import { GeometryPipe } from '../../../geometry/geometry.pipe';
import { GeocoderService } from '../../../geocoder/geocoder';
import { PlacenameSearchResult } from '../../../geocoder/search/search.service';
import { EmbeddedSearchComponent } from '../../../map/controls/search.component';
import { CoordinateSystem, FormattedCoordinate, GeometryType, Shape, ShapeFormat, ShapeFormatError, shapeFromText, withoutClosingPoint } from '../../../entities/geometry/entities.geometry';

export interface PastedCoordinates extends Partial<Shape> {
  coordinates: Position[];
  invalidLines: number[];
  error?: string;
}

export class EditableCoordinate {
  coordinate?: Position;
  name?: string;
  text = '';
  location: FormattedCoordinate | null = null;
  error?: string;

  constructor(coordinate?: Position, name?: string) {
    if (coordinate) {
      this.setCoordinate(coordinate, name);
    }
  }

  setCoordinate([longitude, latitude]: Position, name?: string): void {
    this.coordinate = [longitude, latitude];
    this.name = name;
  }

  equals(other: EditableCoordinate): boolean {
    return this.roundToFiveDecimals(this.coordinate?.[0]) === this.roundToFiveDecimals(other.coordinate?.[0]) &&
      this.roundToFiveDecimals(this.coordinate?.[1]) === this.roundToFiveDecimals(other.coordinate?.[1]);
  }

  private roundToFiveDecimals(num?: number): number | undefined {
    return num === undefined ? undefined : Math.round(num * 100000) / 100000;
  }
}

@Component({
  selector: 'observation-edit-geometry-form',
  templateUrl: './observation-edit-geometry-form.component.html',
  styleUrls: ['./observation-edit-geometry-form.component.scss'],
  providers: [GeometryPipe],
  imports: [
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    EmbeddedSearchComponent
  ]
})
export class ObservationEditGeometryFormComponent implements OnChanges {
  private readonly mapService = inject(MapService);
  private readonly geometryService = inject(GeometryService);
  private readonly geocoderService = inject(GeocoderService);
  private readonly geometryPipe = inject(GeometryPipe);

  feature = input<any>();
  title = input('Location');

  save = output<any>();
  cancel = output<void>();

  rowInputs = viewChildren<ElementRef<HTMLInputElement>>('rowInput');

  currentFeature: any;
  coordinates: EditableCoordinate[] = [];

  selectedShapeType: GeometryType = 'Point';
  featureEdit?: FeatureEdit;

  selectedIndex?: number;
  private crossingEdges = false;

  pasteOpen = false;
  pasteText = '';
  pasted: PastedCoordinates = { coordinates: [], invalidLines: [] };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['feature'] && this.feature()) {
      this.currentFeature = { ...this.feature() };
      this.featureEdit = this.mapService.createFeature(this.currentFeature, {
        geometryChanged: (geometry) => {
          this.geometryChanged(geometry);
        },
        vertexClick: (vertex) => {
          this.onVertexClick(vertex.index);
        },
        vertexDeleted: (vertex) => {
          this.onVertexDeleted(vertex.index);
        }
      });
      this.updateCoordinates();
    }
  }

  onSearchResult(placenameResult: PlacenameSearchResult): void {
    if (this.selectedShapeType === 'Point') {
      this.setPoint(placenameResult);
      return;
    }

    this.featureEdit?.showSearchResult(placenameResult);
  }

  setPoint(placenameResult: PlacenameSearchResult): void {
    const coordinate = new EditableCoordinate(
      placenameResult.position,
      this.resultName(placenameResult)
    );
    this.resetRow(coordinate);
    this.coordinates = [coordinate];
    this.selectedIndex = 0;
    this.updateFeatureCoordinates();
  }

  onRowChange(coordinate: EditableCoordinate, text: string): void {
    coordinate.text = text;
    coordinate.location = this.geocoderService.coordinateFromText(text);
    coordinate.error = undefined;
  }

  rowHint(coordinate: EditableCoordinate): string {
    if (coordinate.error) {
      return coordinate.error;
    }

    if (coordinate.location && coordinate.text !== this.displayCoordinate(coordinate)) {
      const { coordinateSystem, position: [longitude, latitude] } = coordinate.location;
      return `${this.coordinateSystemTitle(coordinateSystem)} → ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }

    return '';
  }

  applyRow(coordinate: EditableCoordinate): void {
    if (coordinate.text === this.displayCoordinate(coordinate)) return;

    if (!coordinate.location) {
      coordinate.error = "Can't read this location. Use lat/lng, DMS, MGRS or GARS";
      return;
    }

    coordinate.setCoordinate(coordinate.location.position);
    this.resetRow(coordinate);
    this.updateFeatureCoordinates();
  }

  resetRow(coordinate: EditableCoordinate): void {
    coordinate.text = this.displayCoordinate(coordinate);
    coordinate.location = null;
    coordinate.error = undefined;
  }

  rowLabel(coordinate: EditableCoordinate, index: number): string {
    if (this.selectedShapeType === 'Point') {
      return coordinate.name || 'Coordinates';
    }

    return coordinate.name ? `${index + 1}. ${coordinate.name}` : `Point ${index + 1}`;
  }

  openPaste(): void {
    this.pasteOpen = true;
    this.onPasteChange('');
  }

  closePaste(): void {
    this.pasteOpen = false;
  }

  onPasteChange(text: string): void {
    this.pasteText = text;
    this.pasted = this.parsePastedCoordinates(text);
  }

  parsePastedCoordinates(text: string): PastedCoordinates {
    try {
      const shape = shapeFromText(text);
      if (shape) {
        return this.inferShapeType({ ...shape, invalidLines: [] });
      }
    } catch (error) {
      return { coordinates: [], invalidLines: [], error: error instanceof ShapeFormatError ? error.message : "Can't read this" };
    }

    const pasted: PastedCoordinates = { coordinates: [], invalidLines: [] };
    text.split(/\r?\n/).forEach((line, index) => {
      const header = index === 0 && /lat|lon/i.test(line);
      line.split(';').filter(entry => entry.trim()).forEach(entry => {
        const coordinate = this.geocoderService.coordinateFromText(entry.trim());
        if (coordinate) {
          pasted.coordinates.push(coordinate.position);
        } else if (!header && !pasted.invalidLines.includes(index + 1)) {
          pasted.invalidLines.push(index + 1);
        }
      });
    });

    return this.inferShapeType(pasted);
  }

  private inferShapeType(pasted: PastedCoordinates): PastedCoordinates {
    if (pasted.type) {
      return pasted;
    }

    // Points that end where they start are a closed polygon ring
    const ring = withoutClosingPoint(pasted.coordinates);
    if (ring.length >= 3 && ring.length < pasted.coordinates.length) {
      return { ...pasted, type: 'Polygon', coordinates: ring };
    }

    return { ...pasted, type: pasted.coordinates.length > 1 ? 'LineString' : 'Point' };
  }

  pasteSummary(): string {
    const { coordinates, invalidLines, format, error } = this.pasted;
    if (error) {
      return error;
    }

    if (invalidLines.length) {
      return `Can't read ${invalidLines.length === 1 ? 'line' : 'lines'} ${invalidLines.join(', ')}`;
    }

    if (!coordinates.length) {
      return '';
    }

    const shape = this.shapeName(this.pasted.type!);
    const points = `${coordinates.length} ${coordinates.length === 1 ? 'point' : 'points'}`;
    return format ? `${this.shapeFormatTitle(format)} ${shape} · ${points}` : `${shape[0].toUpperCase()}${shape.slice(1)} · ${points}`;
  }

  canApplyPaste(): boolean {
    const { coordinates, invalidLines, error } = this.pasted;
    return coordinates.length > 0 && invalidLines.length === 0 && !error;
  }

  hasPasteError(): boolean {
    return this.pasted.error !== undefined || this.pasted.invalidLines.length > 0;
  }

  applyPaste(): void {
    if (!this.canApplyPaste()) return;

    this.selectedShapeType = this.pasted.type!;
    this.currentFeature.geometry.type = this.selectedShapeType;
    this.coordinates = this.pasted.coordinates.map((pasted) => {
      const coordinate = new EditableCoordinate(pasted);
      this.resetRow(coordinate);
      return coordinate;
    });
    this.selectedIndex = undefined;
    this.pasteOpen = false;
    this.updateFeatureCoordinates();
  }

  private coordinateSystemTitle(coordinateSystem: CoordinateSystem): string {
    switch (coordinateSystem) {
      case 'mgrs':
        return 'MGRS';
      case 'dms':
        return 'DMS';
      case 'gars':
        return 'GARS';
      default:
        return 'Lat/Lng';
    }
  }

  private shapeFormatTitle(format: ShapeFormat): string {
    switch (format) {
      case 'wkt':
        return 'WKT';
      case 'kml':
        return 'KML';
      default:
        return 'GeoJSON';
    }
  }

  private shapeName(shapeType: GeometryType): string {
    switch (shapeType) {
      case 'LineString':
        return 'line';
      case 'Polygon':
        return 'polygon';
      default:
        return 'point';
    }
  }

  displayCoordinate(coordinate: EditableCoordinate): string {
    if (!coordinate.coordinate) {
      return '';
    }

    return this.geometryPipe.transform({ type: 'Point', coordinates: coordinate.coordinate }, 5);
  }

  selectVertex(index: number): void {
    this.selectedIndex = index;
    this.featureEdit?.selectVertex(index);
  }

  removeVertex(index: number): void {
    this.coordinates.splice(index, 1);
    this.onVertexDeleted(index);
    this.updateFeatureCoordinates();
  }

  onVertexClick(index: number): void {
    this.selectedIndex = index;
    this.rowInputs()[index]?.nativeElement.focus();
  }

  onVertexDeleted(index: number): void {
    if (this.selectedIndex === index) {
      this.selectedIndex = undefined;
    } else if (this.selectedIndex !== undefined && this.selectedIndex > index) {
      this.selectedIndex--;
    }
  }

  private resultName(placenameResult: PlacenameSearchResult): string | undefined {
    return /[a-z]/i.test(placenameResult.name || '') ? placenameResult.name : undefined;
  }

  geometryChanged(geometry): void {
    this.currentFeature.geometry = geometry;
    this.updateCoordinates();
  }

  onSave(): void {
    if (!this.currentFeature.geometry.type) {
      this.mapService.removeFeatureFromLayer(
        { id: this.currentFeature.id },
        'observations'
      );
      this.featureEdit?.cancel();
      this.save.emit({});
      return;
    }

    if (!this.canSave()) {
      return;
    }

    this.featureEdit?.save();
    this.save.emit({ feature: this.currentFeature });
  }

  onCancel(): void {
    this.coordinates = [];
    this.featureEdit?.cancel();
    this.cancel.emit();
  }

  shapeTypeChanged(shapeType: GeometryType): void {
    if (shapeType === 'Point') {
      this.coordinates = this.coordinates.slice(0, 1);
    } else if (this.selectedShapeType === 'Point') {
      this.coordinates = [];
    }

    this.selectedShapeType = shapeType;
    this.currentFeature.geometry.type = shapeType;
    this.selectedIndex = undefined;
    this.pasteOpen = false;
    this.updateFeatureCoordinates();
  }

  helpText(): string {
    if (this.pasteOpen) {
      return 'Paste coordinates, one per line, or a GeoJSON, WKT or KML shape. A list becomes a line, or a polygon if it ends where it starts. This replaces the current location.';
    }

    switch (this.selectedShapeType) {
      case 'Point':
        return this.geocoderService.placenameSearchEnabled
          ? 'Search for a place or coordinates, or drag the marker on the map.'
          : 'Search for coordinates, or drag the marker on the map.';
      case 'LineString':
        return 'Click the map to draw the line, clicking the last point to finish, or paste a list of coordinates. Drag a point to move it, drag a midpoint to add one, right-click to remove one.';
      case 'Polygon':
        return 'Click the map to draw the corners, clicking the first or last point to finish, or paste a list of coordinates. Drag a point to move it, drag a midpoint to add one, right-click to remove one.';
      default:
        return '';
    }
  }

  searchLabel(): string {
    const placenames = this.geocoderService.placenameSearchEnabled;
    if (this.selectedShapeType === 'Point') {
      return placenames ? 'Search for a place or coordinates' : 'Search for coordinates';
    }

    return placenames ? 'Find a place on the map' : 'Find coordinates on the map';
  }

  canDelete(): boolean {
    return this.selectedShapeType !== 'Point';
  }

  pointsNeeded(): number {
    return Math.max(0, this.minimumVertexCount(this.selectedShapeType) - this.coordinates.length);
  }

  statusText(): string {
    const needed = this.pointsNeeded();
    if (needed > 0) {
      return `Add ${needed} more ${needed === 1 ? 'point' : 'points'} to finish this ${this.shapeName(this.selectedShapeType)}`;
    }

    if (this.hasCrossingEdges()) {
      return 'Edges cross. Move or remove a point to finish.';
    }

    return '';
  }

  private minimumVertexCount(shapeType: GeometryType): number {
    switch (shapeType) {
      case 'LineString':
        return 2;
      case 'Polygon':
        return 3;
      default:
        return 0;
    }
  }

  updateFeatureCoordinates(): void {
    const positions: Position[] = this.coordinates
      .filter(({ coordinate }) => coordinate)
      .map(({ coordinate }) => [...coordinate!]);

    switch (this.selectedShapeType) {
      case 'Point':
        this.currentFeature.geometry.coordinates = positions[0] || [];
        break;
      case 'LineString':
        this.currentFeature.geometry.coordinates = positions;
        break;
      case 'Polygon':
        this.currentFeature.geometry.coordinates = positions.length ? [[...positions, [...positions[0]]]] : [];
        break;
      default:
        return;
    }

    this.refreshCrossingEdges();
    this.featureEdit?.update(this.currentFeature);
    if (this.selectedIndex !== undefined) {
      this.featureEdit?.selectVertex(this.selectedIndex);
    }
  }

  updateCoordinates(): void {
    this.selectedShapeType = this.currentFeature.geometry.type;

    // Rebuild from the map geometry, keeping place names for vertices that did not move
    const previous = this.coordinates;
    this.coordinates = this.getFeatureCoordinates().map((featureCoordinate) => {
      const coordinate = new EditableCoordinate(featureCoordinate);
      coordinate.name = previous.find((p) => p.equals(coordinate))?.name;
      this.resetRow(coordinate);
      return coordinate;
    });

    if (this.selectedIndex !== undefined && this.selectedIndex >= this.coordinates.length) {
      this.selectedIndex = undefined;
    }

    this.refreshCrossingEdges();
  }

  getFeatureCoordinates(): Position[] {
    const coordinates = this.currentFeature.geometry.coordinates;
    switch (this.currentFeature.geometry.type) {
      case 'Point':
        return coordinates?.length ? [coordinates] : [];
      case 'LineString':
        return coordinates || [];
      case 'Polygon':
        return coordinates?.[0]?.slice(0, -1) || [];
      default:
        return [];
    }
  }

  canSave(): boolean {
    switch (this.selectedShapeType) {
      case 'Point':
        return (
          this.coordinates.length === 1 &&
          this.coordinates[0].coordinate !== undefined
        );

      case 'LineString':
        return (
          this.coordinates.length >= 2 &&
          this.coordinates.every(
            (coordinate) => coordinate.coordinate !== undefined
          )
        );

      case 'Polygon':
        return (
          this.coordinates.length >= 3 &&
          this.coordinates.every(
            (coordinate) => coordinate.coordinate !== undefined
          ) &&
          !this.hasCrossingEdges()
        );

      default:
        return false;
    }
  }

  hasCrossingEdges(): boolean {
    return this.crossingEdges;
  }

  private refreshCrossingEdges(): void {
    this.crossingEdges = this.selectedShapeType === 'Polygon' && this.geometryService.featureHasIntersections(this.currentFeature);
  }
}
