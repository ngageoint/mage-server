import { DivIcon, DivIconOptions, DomUtil } from "leaflet";

export interface FixedWidthDivIconOptions extends DivIconOptions {
  iconUrl: string
  iconWidth?: number
}

export class FixedWidthIcon extends DivIcon {
  options: FixedWidthDivIconOptions

  onIconLoad?(icon: FixedWidthIcon, height: number, width: number): void

  constructor(options?: FixedWidthDivIconOptions) {
    options.iconWidth = options.iconWidth || 35
    options.iconUrl = options.iconUrl || '/assets/images/default_marker.png'

    super(options)
  }

  createIcon(oldIcon?: HTMLElement): HTMLElement {
    const div = DomUtil.create('div', 'observation-edit-marker')

    const img = document.createElement('img')
    img.className = "mage-icon-image"
    img.style.width = this.options.iconWidth + 'px'
    img.src = this.options.iconUrl;

    img.onload = (event: any) => {
      div.style.marginTop = -(event.srcElement.height) + 'px'
      div.style.marginLeft = -(event.srcElement.width / 2) + 'px'
    }

    div.appendChild(img)
    if (this.options.html) {
      const tooltip = DomUtil.create('div', 'observation-edit-marker__tooltip')
      tooltip.innerHTML = this.options.html.toString()
      div.appendChild(tooltip)
    }

    return div
  }
}

export function fixedWidthIcon(options?: FixedWidthDivIconOptions): FixedWidthIcon {
  return new FixedWidthIcon(options)
}