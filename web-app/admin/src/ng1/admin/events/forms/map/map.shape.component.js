class MapShapeController {
  constructor($element) {
    this.$element = $element;
  }

  $onChanges() {
    if (this.style) {
      var canvas = this.$element.find('canvas')[0];
      var style = this.style;
      if (this.style[this.primary] && this.style[this.primary][this.variant]) {
        style = this.style[this.primary][this.variant];
      } else if (this.style[this.primary]) {
        style = this.style[this.primary];
      }
  
      if (canvas.getContext){
        var ctx = canvas.getContext('2d');
        ctx.clearRect ( 0 , 0 , canvas.width, canvas.height );
        var rgbFill = this.hexToRgb(style.fill);
        ctx.fillStyle = "rgba("+rgbFill.r+","+rgbFill.g+","+rgbFill.b+","+style['fillOpacity']+")";
        ctx.lineWidth = style['strokeWidth'];
        var rgbStroke = this.hexToRgb(style.stroke);
        ctx.strokeStyle = "rgba("+rgbStroke.r+","+rgbStroke.g+","+rgbStroke.b+","+style['strokeOpacity']+")";
  
        if (this.type === 'Polygon') {
          ctx.beginPath();
          ctx.moveTo(32,2);
          ctx.lineTo(14,2);
          ctx.lineTo(2,18);
          ctx.lineTo(20,18);
          ctx.lineTo(32,2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (this.type === 'LineString') {
          ctx.beginPath();
          ctx.moveTo(2,15);
          ctx.lineTo(12,2);
          ctx.lineTo(22,12);
          ctx.lineTo(32,2);
          ctx.stroke();
        }
      }
    }
  }

  hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
}

MapShapeController.$inject = ['$element'];

export default {
  template: '<canvas height="20" width="34"></canvas>',
  bindings: {
    type: '@',
    style: '<',
    primary: '<',
    variant: '<'
  },
  controller: MapShapeController
};
