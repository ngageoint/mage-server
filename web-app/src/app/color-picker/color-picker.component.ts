import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  Input,
  ViewChild,
  ElementRef,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ColorWrap, RGBA, toState } from 'ngx-color';
import { TinyColor } from '@ctrl/tinycolor';

export interface ColorEvent {
  color: string;
}

@Component({
    selector: 'color-picker',
    templateUrl: './color-picker.component.html',
    styleUrls: ['./color-picker.component.scss'],
    standalone: false
})
export class ColorPickerComponent extends ColorWrap implements OnInit {
  private static openInstance: ColorPickerComponent | null = null;

  @Input() label: string;
  @Input() hexColor: string;
  @Output() onColorChanged = new EventEmitter<ColorEvent>();

  @ViewChild('swatchEl') swatchEl: ElementRef;
  @ViewChild('pickerTemplate') pickerTemplate: TemplateRef<any>;

  background: string;
  activeBackground: string;

  private originalHexColor: string;
  private overlayRef: OverlayRef | null = null;

  constructor(private overlay: Overlay, private viewContainerRef: ViewContainerRef) {
    super();
  }

  ngOnInit(): void {
    this.updateColor();
  }

  override ngOnChanges(): void {
    this.updateColor();
  }

  updateColor(): void {
    const color = this.hexColor || '#000000ff';
    this.setState(toState(color, 0));
    this.background = this.getRGBAStyle(this.rgb);
    this.activeBackground = this.getRGBAStyle(this.rgb);
    this.originalHexColor = color;
  }

  handleValueChange({ data, $event }): void {
    this.handleChange(data, $event);
  }

  afterValidChange(): void {
    this.activeBackground = this.getRGBAStyle(this.rgb);
  }

  open(): void {
    if (ColorPickerComponent.openInstance && ColorPickerComponent.openInstance !== this) {
      ColorPickerComponent.openInstance.forceClose();
    }

    if (this.overlayRef) return;

    this.originalHexColor = this.hexColor || '#000000ff';

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.swatchEl)
      .withPositions([
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    this.overlayRef.backdropClick().subscribe(() => this.cancel());
    this.overlayRef.attach(new TemplatePortal(this.pickerTemplate, this.viewContainerRef));
    ColorPickerComponent.openInstance = this;
  }

  ok(): void {
    this.background = this.getRGBAStyle(this.rgb);
    this.activeBackground = this.background;
    this.onColorChanged.emit({ color: new TinyColor(this.rgb).toHex8String() });
    this.closeOverlay();
  }

  cancel(): void {
    this.setState(toState(this.originalHexColor || this.hexColor || '#000000ff', 0));
    this.background = this.getRGBAStyle(this.rgb);
    this.activeBackground = this.background;
    this.closeOverlay();
  }

  forceClose(): void {
    this.setState(toState(this.originalHexColor || this.hexColor || '#000000ff', 0));
    this.background = this.getRGBAStyle(this.rgb);
    this.activeBackground = this.background;
    this.closeOverlay();
  }

  private closeOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
    if (ColorPickerComponent.openInstance === this) {
      ColorPickerComponent.openInstance = null;
    }
  }

  getRGBAStyle(rgb: RGBA): string {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
  }
}