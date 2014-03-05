$(function () {

    module("bootstrap-scrollspy")

      test("should provide no conflict", function () {
        var scrollspy = $.fn.scrollspy.noConflict()
        ok(!$.fn.scrollspy, 'scrollspy was set back to undefined (org value)')
        $.fn.scrollspy = scrollspy
      })

      test("should be defined on jquery object", function () {
        ok($(document.body).scrollspy, 'scrollspy method is defined')
      })

      test("should return element", function () {
        ok($(document.body).scrollspy()[0] == document.body, 'document.body returned')
      })

      test("should switch active cl***REMOVED*** on scroll", function () {
        var sectionHTML = '<div id="masthead"></div>'
          , $section = $(sectionHTML).append('#qunit-fixture')
          , topbarHTML ='<div cl***REMOVED***="topbar">'
          + '<div cl***REMOVED***="topbar-inner">'
          + '<div cl***REMOVED***="container">'
          + '<h3><a href="#">Bootstrap</a></h3>'
          + '<ul cl***REMOVED***="nav">'
          + '<li><a href="#masthead">Overview</a></li>'
          + '</ul>'
          + '</div>'
          + '</div>'
          + '</div>'
          , $topbar = $(topbarHTML).scrollspy()

        ok($topbar.find('.active', true))
      })

})