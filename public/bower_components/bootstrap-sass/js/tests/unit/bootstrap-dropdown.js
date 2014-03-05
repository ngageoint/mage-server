$(function () {

    module("bootstrap-dropdowns")

      test("should provide no conflict", function () {
        var dropdown = $.fn.dropdown.noConflict()
        ok(!$.fn.dropdown, 'dropdown was set back to undefined (org value)')
        $.fn.dropdown = dropdown
      })

      test("should be defined on jquery object", function () {
        ok($(document.body).dropdown, 'dropdown method is defined')
      })

      test("should return element", function () {
        var el = $("<div />")
        ok(el.dropdown()[0] === el[0], 'same element returned')
      })

      test("should not open dropdown if target is disabled", function () {
        var dropdownHTML = '<ul cl***REMOVED***="tabs">'
          + '<li cl***REMOVED***="dropdown">'
          + '<button disabled href="#" cl***REMOVED***="btn dropdown-toggle" data-toggle="dropdown">Dropdown</button>'
          + '<ul cl***REMOVED***="dropdown-menu">'
          + '<li><a href="#">Secondary link</a></li>'
          + '<li><a href="#">Something else here</a></li>'
          + '<li cl***REMOVED***="divider"></li>'
          + '<li><a href="#">Another link</a></li>'
          + '</ul>'
          + '</li>'
          + '</ul>'
          , dropdown = $(dropdownHTML).find('[data-toggle="dropdown"]').dropdown().click()

        ok(!dropdown.parent('.dropdown').hasCl***REMOVED***('open'), 'open cl***REMOVED*** added on click')
      })

      test("should not open dropdown if target is disabled", function () {
        var dropdownHTML = '<ul cl***REMOVED***="tabs">'
          + '<li cl***REMOVED***="dropdown">'
          + '<button href="#" cl***REMOVED***="btn dropdown-toggle disabled" data-toggle="dropdown">Dropdown</button>'
          + '<ul cl***REMOVED***="dropdown-menu">'
          + '<li><a href="#">Secondary link</a></li>'
          + '<li><a href="#">Something else here</a></li>'
          + '<li cl***REMOVED***="divider"></li>'
          + '<li><a href="#">Another link</a></li>'
          + '</ul>'
          + '</li>'
          + '</ul>'
          , dropdown = $(dropdownHTML).find('[data-toggle="dropdown"]').dropdown().click()

        ok(!dropdown.parent('.dropdown').hasCl***REMOVED***('open'), 'open cl***REMOVED*** added on click')
      })

      test("should add cl***REMOVED*** open to menu if clicked", function () {
        var dropdownHTML = '<ul cl***REMOVED***="tabs">'
          + '<li cl***REMOVED***="dropdown">'
          + '<a href="#" cl***REMOVED***="dropdown-toggle" data-toggle="dropdown">Dropdown</a>'
          + '<ul cl***REMOVED***="dropdown-menu">'
          + '<li><a href="#">Secondary link</a></li>'
          + '<li><a href="#">Something else here</a></li>'
          + '<li cl***REMOVED***="divider"></li>'
          + '<li><a href="#">Another link</a></li>'
          + '</ul>'
          + '</li>'
          + '</ul>'
          , dropdown = $(dropdownHTML).find('[data-toggle="dropdown"]').dropdown().click()

        ok(dropdown.parent('.dropdown').hasCl***REMOVED***('open'), 'open cl***REMOVED*** added on click')
      })

      test("should test if element has a # before ***REMOVED***uming it's a selector", function () {
        var dropdownHTML = '<ul cl***REMOVED***="tabs">'
          + '<li cl***REMOVED***="dropdown">'
          + '<a href="/foo/" cl***REMOVED***="dropdown-toggle" data-toggle="dropdown">Dropdown</a>'
          + '<ul cl***REMOVED***="dropdown-menu">'
          + '<li><a href="#">Secondary link</a></li>'
          + '<li><a href="#">Something else here</a></li>'
          + '<li cl***REMOVED***="divider"></li>'
          + '<li><a href="#">Another link</a></li>'
          + '</ul>'
          + '</li>'
          + '</ul>'
          , dropdown = $(dropdownHTML).find('[data-toggle="dropdown"]').dropdown().click()

        ok(dropdown.parent('.dropdown').hasCl***REMOVED***('open'), 'open cl***REMOVED*** added on click')
      })


      test("should remove open cl***REMOVED*** if body clicked", function () {
        var dropdownHTML = '<ul cl***REMOVED***="tabs">'
          + '<li cl***REMOVED***="dropdown">'
          + '<a href="#" cl***REMOVED***="dropdown-toggle" data-toggle="dropdown">Dropdown</a>'
          + '<ul cl***REMOVED***="dropdown-menu">'
          + '<li><a href="#">Secondary link</a></li>'
          + '<li><a href="#">Something else here</a></li>'
          + '<li cl***REMOVED***="divider"></li>'
          + '<li><a href="#">Another link</a></li>'
          + '</ul>'
          + '</li>'
          + '</ul>'
          , dropdown = $(dropdownHTML)
            .appendTo('#qunit-fixture')
            .find('[data-toggle="dropdown"]')
            .dropdown()
            .click()
        ok(dropdown.parent('.dropdown').hasCl***REMOVED***('open'), 'open cl***REMOVED*** added on click')
        $('body').click()
        ok(!dropdown.parent('.dropdown').hasCl***REMOVED***('open'), 'open cl***REMOVED*** removed')
        dropdown.remove()
      })

      test("should remove open cl***REMOVED*** if body clicked, with multiple drop downs", function () {
          var dropdownHTML =
            '<ul cl***REMOVED***="nav">'
            + '    <li><a href="#menu1">Menu 1</a></li>'
            + '    <li cl***REMOVED***="dropdown" id="testmenu">'
            + '      <a cl***REMOVED***="dropdown-toggle" data-toggle="dropdown" href="#testmenu">Test menu <b cl***REMOVED***="caret"></b></a>'
            + '      <ul cl***REMOVED***="dropdown-menu" role="menu">'
            + '        <li><a href="#sub1">Submenu 1</a></li>'
            + '      </ul>'
            + '    </li>'
            + '</ul>'
            + '<div cl***REMOVED***="btn-group">'
            + '    <button cl***REMOVED***="btn">Actions</button>'
            + '    <button cl***REMOVED***="btn dropdown-toggle" data-toggle="dropdown"><span cl***REMOVED***="caret"></span></button>'
            + '    <ul cl***REMOVED***="dropdown-menu">'
            + '        <li><a href="#">Action 1</a></li>'
            + '    </ul>'
            + '</div>'
          , dropdowns = $(dropdownHTML).appendTo('#qunit-fixture').find('[data-toggle="dropdown"]')
          , first = dropdowns.first()
          , last = dropdowns.last()

        ok(dropdowns.length == 2, "Should be two dropdowns")

        first.click()
        ok(first.parents('.open').length == 1, 'open cl***REMOVED*** added on click')
        ok($('#qunit-fixture .open').length == 1, 'only one object is open')
        $('body').click()
        ok($("#qunit-fixture .open").length === 0, 'open cl***REMOVED*** removed')

        last.click()
        ok(last.parent('.open').length == 1, 'open cl***REMOVED*** added on click')
        ok($('#qunit-fixture .open').length == 1, 'only one object is open')
        $('body').click()
        ok($("#qunit-fixture .open").length === 0, 'open cl***REMOVED*** removed')

        $("#qunit-fixture").html("")
      })

})