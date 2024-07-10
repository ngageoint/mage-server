import { setOptions, DivIcon, DivIconOptions, DomUtil, Icon, icon } from "leaflet";

export interface FixedWidthDivIconOptions extends DivIconOptions {
  tooltip: boolean
  iconWidth: number
  onIconLoad?(icon: FixedWidthIcon, height: number, width: number): void;
}

export class FixedWidthIcon extends DivIcon {
  tooltip = false
  options: FixedWidthDivIconOptions

  onIconLoad?(icon: FixedWidthIcon, height: number, width: number): void

  constructor(options?: FixedWidthDivIconOptions) {
    super(options)

    setOptions(this, options)

    if (options.iconWidth) {
      options.iconWidth = 35
    }

    if (options.iconUrl) {
      options.iconUrl = '/assets/images/default_marker.png'
    }
  }

  createIcon(oldIcon?: HTMLElement): HTMLElement {
    if (!oldIcon) {
      console.log('create new icon')

      // get icon width/height
      const img = new Image()
      img.src = this.options.iconUrl

      img.onload = (icon: any) => {
        console.log('on load called to get icon width/height')
        // if (this.onIconLoad) {
          // this.onIconLoad(this, icon.srcElement.height, icon.srcElement.width)
        // }
        setOptions(this, {
          iconAnchor: [0, icon.srcElement.height],
          opacity: .2
        })
        this.createIcon(img)
      }

      return img;
    } else {
      console.log('we have an icon with a width/height')
      const icon = new Icon({
        iconUrl: this.options.iconUrl,
        iconSize: [44, 44],
        iconAnchor: [0, 44],
        opacity: .2
      })
      
      // const div = DivIcon.prototype.createIcon.call(this);
      // div.style["margin-left"] = (this.options.iconWidth / -2) + 'px';

      // const img = new Image();
      // img.src = this.options.iconUrl
      // // img.className = "mage-icon-image";
      // img.style.width = this.options.iconWidth + 'px';

      // div.appendChild(img)
      // if (this.tooltip) {
      //   const tooltip = DomUtil.create('div', 'marker-tooltip')
      //   tooltip.innerHTML = '<b>Edit Observation</b><div>Drag this marker to re-position</div>'
      //   div.insertBefore(tooltip, div.firstChild)
      // }

      return icon.createIcon()
    } 
  }
}

export function fixedWidthIcon(options?: FixedWidthDivIconOptions): FixedWidthIcon {
  return new FixedWidthIcon(options)
}