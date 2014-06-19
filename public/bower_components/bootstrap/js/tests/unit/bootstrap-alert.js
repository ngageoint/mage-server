$(function () {

    module("bootstrap-alerts")

      test("should provide no conflict", function () {
        var alert = $.fn.alert.noConflict()
        ok(!$.fn.alert, 'alert was set back to undefined (org value)')
        $.fn.alert = alert
      })

      test("should be defined on jquery object", function () {
        ok($(document.body).alert, 'alert method is defined')
      })

      test("should return element", function () {
        ok($(document.body).alert()[0] == document.body, 'document.body returned')
      })

      test("should fade element out on clicking .close", function () {
        var alertHTML = '<div cl***REMOVED***="alert-message warning fade in">'
          + '<a cl***REMOVED***="close" href="#" data-dismiss="alert">×</a>'
          + '<p><strong>Holy guacamole!</strong> Best check yo self, you\'re not looking too good.</p>'
          + '</div>'
          , alert = $(alertHTML).alert()

        alert.find('.close').click()

        ok(!alert.hasCl***REMOVED***('in'), 'remove .in cl***REMOVED*** on .close click')
      })

      test("should remove element when clicking .close", function () {
        $.support.transition = false

        var alertHTML = '<div cl***REMOVED***="alert-message warning fade in">'
          + '<a cl***REMOVED***="close" href="#" data-dismiss="alert">×</a>'
          + '<p><strong>Holy guacamole!</strong> Best check yo self, you\'re not looking too good.</p>'
          + '</div>'
          , alert = $(alertHTML).appendTo('#qunit-fixture').alert()

        ok($('#qunit-fixture').find('.alert-message').length, 'element added to dom')

        alert.find('.close').click()

        ok(!$('#qunit-fixture').find('.alert-message').length, 'element removed from dom')
      })

      test("should not fire closed when close is prevented", function () {
        $.support.transition = false
        stop();
        $('<div cl***REMOVED***="alert"/>')
          .bind('close', function (e) {
            e.preventDefault();
            ok(true);
            start();
          })
          .bind('closed', function () {
            ok(false);
          })
          .alert('close')
      })

})