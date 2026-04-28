import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  Input,
  HostListener
} from '@angular/core';
import { ColorWrap, RGBA, toState } from 'ngx-color';
import { TinyColor } from '@ctrl/tinycolor';

export interface ColorEvent {
  color: string;
}

@Component({
  selector: 'color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class ColorPickerComponent extends ColorWrap implements OnInit {
  private static openInstance: ColorPickerComponent | null = null;

  @Input() label: string;
  @Input() hexColor: string;
  @Output() onColorChanged = new EventEmitter<ColorEvent>();

  background: string;
  activeBackground: string;
  showColorPicker = false;

  private originalHexColor: string;

  constructor() {
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
    if (
      ColorPickerComponent.openInstance &&
      ColorPickerComponent.openInstance !== this
    ) {
      ColorPickerComponent.openInstance.forceClose();
    }

    this.originalHexColor = this.hexColor || '#000000ff';
    this.showColorPicker = true;
    ColorPickerComponent.openInstance = this;
  }

  ok(): void {
    this.showColorPicker = false;
    this.background = this.getRGBAStyle(this.rgb);
    this.activeBackground = this.background;

    this.onColorChanged.emit({
      color: new TinyColor(this.rgb).toHex8String()
    });

    if (ColorPickerComponent.openInstance === this) {
      ColorPickerComponent.openInstance = null;
    }
  }

  cancel(): void {
    this.setState(toState(this.originalHexColor || this.hexColor || '#000000ff', 0));
    this.background = this.getRGBAStyle(this.rgb);
    this.activeBackground = this.background;
    this.showColorPicker = false;

    if (ColorPickerComponent.openInstance === this) {
      ColorPickerComponent.openInstance = null;
    }
  }

  forceClose(): void {
    this.showColorPicker = false;
    this.setState(toState(this.originalHexColor || this.hexColor || '#000000ff', 0));
    this.background = this.getRGBAStyle(this.rgb);
    this.activeBackground = this.background;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showColorPicker) {
      this.cancel();
    }
  }

  getRGBAStyle(rgb: RGBA): string {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
  }
}