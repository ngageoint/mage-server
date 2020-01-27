module.exports = UserIconService;

UserIconService.$inject = [];

function UserIconService() {

  var service = {
    drawMarker: drawMarker,
    canvasToPng: canvasToPng
  };

  return service;

  function drawMarker(canvas, color, text) {
    var ctx = canvas.getContext('2d');
    canvas.height = 44;
    canvas.width = 44;

    ctx.clearRect (0 , 0 , canvas.width, canvas.height);

    ctx.strokeStyle = hexToRgb(color, 1);
    ctx.fillStyle = hexToRgb(color, 1);

    ctx.moveTo(22, 43);
    ctx.lineTo(9, 26);
    ctx.lineTo(35, 26);
    ctx.lineTo(22, 43);
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(22, 17, 16, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';

    ctx.beginPath();
    ctx.arc(22, 17, 13, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 14px "RobotoMono"';
    ctx.fillStyle = hexToRgb(color, 1);
    ctx.fillText(text, 22, 17);
  }

  function canvasToPng(canvas) {
    var icon = canvas.toDataURL("image/png");

    if (icon) {
      var byteString = atob(icon.split(',')[1]);
      var ab = new ArrayBuffer(byteString.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      return new Blob([ab], { type: 'image/png' });
    }
  }

  function hexToRgb(hex, opacity) {
    hex = hex.replace('#','');
    var r = parseInt(hex.substring(0,2), 16);
    var g = parseInt(hex.substring(2,4), 16);
    var b = parseInt(hex.substring(4,6), 16);

    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
  }
}
