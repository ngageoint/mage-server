mage.directive('rotatedImg', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      var setCl***REMOVED*** = function(imgTag) {
        EXIF.getData(element[0], function() {
          var exif = EXIF.getAllTags(element[0]);
          switch(exif.Orientation) {
            case 3:
            element.addCl***REMOVED***('rotate180');
            console.info('180 fool');
            break;
            case 6:
            element.addCl***REMOVED***('rotate90');
            break;
            case 8:
            element.addCl***REMOVED***('rotate270');
            break;
          }
        });
      }

      attrs.$observe('src', function(src) {
        console.info('exif data', element[0]);

        if (!element[0].complete) {
          element.on('load', 
            function() {
              setCl***REMOVED***(element[0]);
            }
          ); 
        } else {
          setCl***REMOVED***(element[0]);
        }        
      });
    }
  }
});