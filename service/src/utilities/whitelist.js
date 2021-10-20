exports.project = project;

function project(obj, projection) {
  var whiteKeys = Object.keys(projection);
  Object.keys(obj).reduce(function(whiteObj, key) {
    if (!obj.hasOwnProperty(key)) {
      return;
    }

    if (whiteKeys.indexOf(key) === -1 || !projection[key]) {
      delete whiteObj[key];
    } else if (typeof obj[key] === 'object' && projection[key] !== true) {
      project(whiteObj[key], projection[key]);
    }

    return whiteObj;
  }, obj);
}
