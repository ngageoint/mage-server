import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
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
  @Input() label: string
  @Input() hexColor: string
  @Output() onColorChanged = new EventEmitter<ColorEvent>()

  background: string
  activeBackground: string
  showColorPicker = false

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.updateColor()
  }

  ngOnChanges(): void {
    this.updateColor()
  }

  updateColor(): void {
    this.setState(toState(this.hexColor, 0))
    this.background = this.getRGBAStyle(this.rgb)
  }

  handleValueChange({ data, $event }): void {
    this.handleChange(data, $event);
  }

  afterValidChange(): void {
    this.activeBackground = this.getRGBAStyle(this.rgb);
  }

  open(): void {
    this.showColorPicker = true;
  }

  ok(): void {
    this.showColorPicker = false;
    this.background = this.getRGBAStyle(this.rgb);

    this.onColorChanged.emit({
      color: new TinyColor(this.rgb).toHex8String()
    });
  }

  cancel(): void {
    this.showColorPicker = false;
  }

  getRGBAStyle(rgb: RGBA): string {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
  }

}
