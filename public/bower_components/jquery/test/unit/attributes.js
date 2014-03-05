module("attributes", { teardown: moduleTeardown });

var bareObj = function( value ) { return value; };
var functionReturningObj = function( value ) { return (function() { return value; }); };

/*
	======== local reference =======
	bareObj and functionReturningObj can be used to test p***REMOVED***ing functions to setters
	See testVal below for an example

	bareObj( value );
		This function returns whatever value is p***REMOVED***ed in

	functionReturningObj( value );
		Returns a function that returns the value
*/

test("jQuery.propFix integrity test", function() {
	expect(1);

	//  This must be maintained and equal jQuery.attrFix when appropriate
	//  Ensure that accidental or erroneous property
	//  overwrites don't occur
	//  This is simply for better code coverage and future proofing.
	var props = {
		"tabindex": "tabIndex",
		"readonly": "readOnly",
		"for": "htmlFor",
		"cl***REMOVED***": "cl***REMOVED***Name",
		"maxlength": "maxLength",
		"cellspacing": "cellSpacing",
		"cellpadding": "cellPadding",
		"rowspan": "rowSpan",
		"colspan": "colSpan",
		"usemap": "useMap",
		"frameborder": "frameBorder",
		"contenteditable": "contentEditable"
	};

	if ( !jQuery.support.enctype ) {
		props.enctype = "encoding";
	}

	deepEqual(props, jQuery.propFix, "jQuery.propFix p***REMOVED***es integrity check");
});

test("attr(String)", function() {
	expect(46);

	equal( jQuery("#text1").attr("type"), "text", "Check for type attribute" );
	equal( jQuery("#radio1").attr("type"), "radio", "Check for type attribute" );
	equal( jQuery("#check1").attr("type"), "checkbox", "Check for type attribute" );
	equal( jQuery("#simon1").attr("rel"), "bookmark", "Check for rel attribute" );
	equal( jQuery("#google").attr("title"), "Google!", "Check for title attribute" );
	equal( jQuery("#mark").attr("hreflang"), "en", "Check for hreflang attribute" );
	equal( jQuery("#en").attr("lang"), "en", "Check for lang attribute" );
	equal( jQuery("#simon").attr("cl***REMOVED***"), "blog link", "Check for cl***REMOVED*** attribute" );
	equal( jQuery("#name").attr("name"), "name", "Check for name attribute" );
	equal( jQuery("#text1").attr("name"), "action", "Check for name attribute" );
	ok( jQuery("#form").attr("action").indexOf("formaction") >= 0, "Check for action attribute" );
	equal( jQuery("#text1").attr("value", "t").attr("value"), "t", "Check setting the value attribute" );
	equal( jQuery("<div value='t'></div>").attr("value"), "t", "Check setting custom attr named 'value' on a div" );
	equal( jQuery("#form").attr("blah", "blah").attr("blah"), "blah", "Set non-existant attribute on a form" );
	equal( jQuery("#foo").attr("height"), undefined, "Non existent height attribute should return undefined" );

	// [7472] & [3113] (form contains an input with name="action" or name="id")
	var extras = jQuery("<input name='id' name='name' /><input id='target' name='target' />").appendTo("#testForm");
	equal( jQuery("#form").attr("action","newformaction").attr("action"), "newformaction", "Check that action attribute was changed" );
	equal( jQuery("#testForm").attr("target"), undefined, "Retrieving target does not equal the input with name=target" );
	equal( jQuery("#testForm").attr("target", "newTarget").attr("target"), "newTarget", "Set target successfully on a form" );
	equal( jQuery("#testForm").removeAttr("id").attr("id"), undefined, "Retrieving id does not equal the input with name=id after id is removed [#7472]" );
	// Bug #3685 (form contains input with name="name")
	equal( jQuery("#testForm").attr("name"), undefined, "Retrieving name does not retrieve input with name=name" );
	extras.remove();

	equal( jQuery("#text1").attr("maxlength"), "30", "Check for maxlength attribute" );
	equal( jQuery("#text1").attr("maxLength"), "30", "Check for maxLength attribute" );
	equal( jQuery("#area1").attr("maxLength"), "30", "Check for maxLength attribute" );

	// using innerHTML in IE causes href attribute to be serialized to the full path
	jQuery("<a/>").attr({ "id": "tAnchor5", "href": "#5" }).appendTo("#qunit-fixture");
	equal( jQuery("#tAnchor5").attr("href"), "#5", "Check for non-absolute href (an anchor)" );

	// list attribute is readonly by default in browsers that support it
	jQuery("#list-test").attr("list", "datalist");
	equal( jQuery("#list-test").attr("list"), "datalist", "Check setting list attribute" );

	// Related to [5574] and [5683]
	var body = document.body, $body = jQuery(body);

	strictEqual( $body.attr("foo"), undefined, "Make sure that a non existent attribute returns undefined" );

	body.setAttribute("foo", "baz");
	equal( $body.attr("foo"), "baz", "Make sure the dom attribute is retrieved when no expando is found" );

	$body.attr("foo","cool");
	equal( $body.attr("foo"), "cool", "Make sure that setting works well when both expando and dom attribute are available" );

	body.removeAttribute("foo"); // Cleanup

	var select = document.createElement("select"), optgroup = document.createElement("optgroup"), option = document.createElement("option");
	optgroup.appendChild( option );
	select.appendChild( optgroup );

	equal( jQuery( option ).attr("selected"), "selected", "Make sure that a single option is selected, even when in an optgroup." );

	var $img = jQuery("<img style='display:none' width='215' height='53' src='http://static.jquery.com/files/rocker/images/logo_jquery_215x53.gif'/>").appendTo("body");
	equal( $img.attr("width"), "215", "Retrieve width attribute an an element with display:none." );
	equal( $img.attr("height"), "53", "Retrieve height attribute an an element with display:none." );

	// Check for style support
	ok( !!~jQuery("#dl").attr("style").indexOf("position"), "Check style attribute getter, also normalize css props to lowercase" );
	ok( !!~jQuery("#foo").attr("style", "position:absolute;").attr("style").indexOf("position"), "Check style setter" );

	// Check value on button element (#1954)
	var $button = jQuery("<button value='foobar'>text</button>").insertAfter("#button");
	equal( $button.attr("value"), "foobar", "Value retrieval on a button does not return innerHTML" );
	equal( $button.attr("value", "baz").html(), "text", "Setting the value does not change innerHTML" );

	// Attributes with a colon on a table element (#1591)
	equal( jQuery("#table").attr("test:attrib"), undefined, "Retrieving a non-existent attribute on a table with a colon does not throw an error." );
	equal( jQuery("#table").attr("test:attrib", "foobar").attr("test:attrib"), "foobar", "Setting an attribute on a table with a colon does not throw an error." );

	var $form = jQuery("<form cl***REMOVED***='something'></form>").appendTo("#qunit-fixture");
	equal( $form.attr("cl***REMOVED***"), "something", "Retrieve the cl***REMOVED*** attribute on a form." );

	var $a = jQuery("<a href='#' onclick='something()'>Click</a>").appendTo("#qunit-fixture");
	equal( $a.attr("onclick"), "something()", "Retrieve ^on attribute without anonymous function wrapper." );

	ok( jQuery("<div/>").attr("doesntexist") === undefined, "Make sure undefined is returned when no attribute is found." );
	ok( jQuery("<div/>").attr("title") === undefined, "Make sure undefined is returned when no attribute is found." );
	equal( jQuery("<div/>").attr("title", "something").attr("title"), "something", "Set the title attribute." );
	ok( jQuery().attr("doesntexist") === undefined, "Make sure undefined is returned when no element is there." );
	equal( jQuery("<div/>").attr("value"), undefined, "An unset value on a div returns undefined." );
	equal( jQuery("<input/>").attr("value"), "", "An unset value on an input returns current value." );

	$form = jQuery("#form").attr("enctype", "multipart/form-data");
	equal( $form.prop("enctype"), "multipart/form-data", "Set the enctype of a form (encoding in IE6/7 #6743)" );
});

test("attr(String) in XML Files", function() {
	expect(3);
	var xml = createDashboardXML();
	equal( jQuery( "locations", xml ).attr("cl***REMOVED***"), "foo", "Check cl***REMOVED*** attribute in XML document" );
	equal( jQuery( "location", xml ).attr("for"), "bar", "Check for attribute in XML document" );
	equal( jQuery( "location", xml ).attr("checked"), "different", "Check that hooks are not attached in XML document" );
});

test("attr(String, Function)", function() {
	expect(2);
	equal( jQuery("#text1").attr("value", function() { return this.id; })[0].value, "text1", "Set value from id" );
	equal( jQuery("#text1").attr("title", function(i) { return i; }).attr("title"), "0", "Set value with an index");
});

test("attr(Hash)", function() {
	expect(3);
	var p***REMOVED*** = true;
	jQuery("div").attr({"foo": "baz", "zoo": "ping"}).each(function(){
		if ( this.getAttribute("foo") != "baz" && this.getAttribute("zoo") != "ping" ) {
			p***REMOVED*** = false;
		}
	});
	ok( p***REMOVED***, "Set Multiple Attributes" );
	equal( jQuery("#text1").attr({"value": function() { return this["id"]; }})[0].value, "text1", "Set attribute to computed value #1" );
	equal( jQuery("#text1").attr({"title": function(i) { return i; }}).attr("title"), "0", "Set attribute to computed value #2");
});

test("attr(String, Object)", function() {
	expect(81);

	var div = jQuery("div").attr("foo", "bar"),
		fail = false;

	for ( var i = 0; i < div.size(); i++ ) {
		if ( div.get(i).getAttribute("foo") != "bar" ){
			fail = i;
			break;
		}
	}

	equal( fail, false, "Set Attribute, the #" + fail + " element didn't get the attribute 'foo'" );

	ok( jQuery("#foo").attr({ "width": null }), "Try to set an attribute to nothing" );

	jQuery("#name").attr("name", "something");
	equal( jQuery("#name").attr("name"), "something", "Set name attribute" );
	jQuery("#name").attr("name", null);
	equal( jQuery("#name").attr("name"), undefined, "Remove name attribute" );
	var $input = jQuery("<input>", { name: "something", id: "specified" });
	equal( $input.attr("name"), "something", "Check element creation gets/sets the name attribute." );
	equal( $input.attr("id"), "specified", "Check element creation gets/sets the id attribute." );

	jQuery("#check2").prop("checked", true).prop("checked", false).attr("checked", true);
	equal( document.getElementById("check2").checked, true, "Set checked attribute" );
	equal( jQuery("#check2").prop("checked"), true, "Set checked attribute" );
	equal( jQuery("#check2").attr("checked"), "checked", "Set checked attribute" );
	jQuery("#check2").attr("checked", false);
	equal( document.getElementById("check2").checked, false, "Set checked attribute" );
	equal( jQuery("#check2").prop("checked"), false, "Set checked attribute" );
	equal( jQuery("#check2").attr("checked"), undefined, "Set checked attribute" );
	jQuery("#text1").attr("readonly", true);
	equal( document.getElementById("text1").readOnly, true, "Set readonly attribute" );
	equal( jQuery("#text1").prop("readOnly"), true, "Set readonly attribute" );
	equal( jQuery("#text1").attr("readonly"), "readonly", "Set readonly attribute" );
	jQuery("#text1").attr("readonly", false);
	equal( document.getElementById("text1").readOnly, false, "Set readonly attribute" );
	equal( jQuery("#text1").prop("readOnly"), false, "Set readonly attribute" );
	equal( jQuery("#text1").attr("readonly"), undefined, "Set readonly attribute" );

	jQuery("#check2").prop("checked", true);
	equal( document.getElementById("check2").checked, true, "Set checked attribute" );
	equal( jQuery("#check2").prop("checked"), true, "Set checked attribute" );
	equal( jQuery("#check2").attr("checked"), "checked", "Set checked attribute" );
	jQuery("#check2").prop("checked", false);
	equal( document.getElementById("check2").checked, false, "Set checked attribute" );
	equal( jQuery("#check2").prop("checked"), false, "Set checked attribute" );
	equal( jQuery("#check2").attr("checked"), undefined, "Set checked attribute" );

	jQuery("#check2").attr("checked", "checked");
	equal( document.getElementById("check2").checked, true, "Set checked attribute with 'checked'" );
	equal( jQuery("#check2").prop("checked"), true, "Set checked attribute" );
	equal( jQuery("#check2").attr("checked"), "checked", "Set checked attribute" );

	QUnit.reset();

	var $radios = jQuery("#checkedtest").find("input[type='radio']");
	$radios.eq(1).click();
	equal( $radios.eq(1).prop("checked"), true, "Second radio was checked when clicked");
	equal( $radios.attr("checked"), $radios[0].checked ? "checked" : undefined, "Known booleans do not fall back to attribute presence (#10278)");

	jQuery("#text1").prop("readOnly", true);
	equal( document.getElementById("text1").readOnly, true, "Set readonly attribute" );
	equal( jQuery("#text1").prop("readOnly"), true, "Set readonly attribute" );
	equal( jQuery("#text1").attr("readonly"), "readonly", "Set readonly attribute" );
	jQuery("#text1").prop("readOnly", false);
	equal( document.getElementById("text1").readOnly, false, "Set readonly attribute" );
	equal( jQuery("#text1").prop("readOnly"), false, "Set readonly attribute" );
	equal( jQuery("#text1").attr("readonly"), undefined, "Set readonly attribute" );

	jQuery("#name").attr("maxlength", "5");
	equal( document.getElementById("name").maxLength, 5, "Set maxlength attribute" );
	jQuery("#name").attr("maxLength", "10");
	equal( document.getElementById("name").maxLength, 10, "Set maxlength attribute" );

	// HTML5 boolean attributes
	var $text = jQuery("#text1").attr({
		"autofocus": true,
		"required": true
	});
	equal( $text.attr("autofocus"), "autofocus", "Set boolean attributes to the same name" );
	equal( $text.attr("autofocus", false).attr("autofocus"), undefined, "Setting autofocus attribute to false removes it" );
	equal( $text.attr("required"), "required", "Set boolean attributes to the same name" );
	equal( $text.attr("required", false).attr("required"), undefined, "Setting required attribute to false removes it" );

	var $details = jQuery("<details open></details>").appendTo("#qunit-fixture");
	equal( $details.attr("open"), "open", "open attribute presense indicates true" );
	equal( $details.attr("open", false).attr("open"), undefined, "Setting open attribute to false removes it" );

	$text.attr("data-something", true);
	equal( $text.attr("data-something"), "true", "Set data attributes");
	equal( $text.data("something"), true, "Setting data attributes are not affected by boolean settings");
	$text.attr("data-another", false);
	equal( $text.attr("data-another"), "false", "Set data attributes");
	equal( $text.data("another"), false, "Setting data attributes are not affected by boolean settings" );
	equal( $text.attr("aria-disabled", false).attr("aria-disabled"), "false", "Setting aria attributes are not affected by boolean settings");
	$text.removeData("something").removeData("another").removeAttr("aria-disabled");

	jQuery("#foo").attr("contenteditable", true);
	equal( jQuery("#foo").attr("contenteditable"), "true", "Enumerated attributes are set properly" );

	var attributeNode = document.createAttribute("irrelevant"),
		commentNode = document.createComment("some comment"),
		textNode = document.createTextNode("some text"),
		obj = {};

	jQuery.each( [commentNode, textNode, attributeNode], function( i, elem ) {
		var $elem = jQuery( elem );
		$elem.attr( "nonexisting", "foo" );
		strictEqual( $elem.attr("nonexisting"), undefined, "attr(name, value) works correctly on comment and text nodes (bug #7500)." );
	});

	jQuery.each( [window, document, obj, "#firstp"], function( i, elem ) {
		var $elem = jQuery( elem );
		strictEqual( $elem.attr("nonexisting"), undefined, "attr works correctly for non existing attributes (bug #7500)." );
		equal( $elem.attr("something", "foo" ).attr("something"), "foo", "attr falls back to prop on unsupported arguments" );
	});

	var table = jQuery("#table").append("<tr><td>cell</td></tr><tr><td>cell</td><td>cell</td></tr><tr><td>cell</td><td>cell</td></tr>"),
		td = table.find("td:first");
	td.attr("rowspan", "2");
	equal( td[0]["rowSpan"], 2, "Check rowspan is correctly set" );
	td.attr("colspan", "2");
	equal( td[0]["colSpan"], 2, "Check colspan is correctly set" );
	table.attr("cellspacing", "2");
	equal( table[0]["cellSpacing"], "2", "Check cellspacing is correctly set" );

	equal( jQuery("#area1").attr("value"), "foobar", "Value attribute retrieves the property for backwards compatibility." );

	// for #1070
	jQuery("#name").attr("someAttr", "0");
	equal( jQuery("#name").attr("someAttr"), "0", "Set attribute to a string of \"0\"" );
	jQuery("#name").attr("someAttr", 0);
	equal( jQuery("#name").attr("someAttr"), "0", "Set attribute to the number 0" );
	jQuery("#name").attr("someAttr", 1);
	equal( jQuery("#name").attr("someAttr"), "1", "Set attribute to the number 1" );

	// using contents will get comments regular, text, and comment nodes
	var j = jQuery("#nonnodes").contents();

	j.attr("name", "attrvalue");
	equal( j.attr("name"), "attrvalue", "Check node,textnode,comment for attr" );
	j.removeAttr("name");

	// Type
	var type = jQuery("#check2").attr("type");
	var thrown = false;
	try {
		jQuery("#check2").attr("type","hidden");
	} catch(e) {
		thrown = true;
	}
	ok( thrown, "Exception thrown when trying to change type property" );
	equal( type, jQuery("#check2").attr("type"), "Verify that you can't change the type of an input element" );

	var check = document.createElement("input");
	thrown = true;
	try {
		jQuery(check).attr("type", "checkbox");
	} catch(e) {
		thrown = false;
	}
	ok( thrown, "Exception thrown when trying to change type property" );
	equal( "checkbox", jQuery(check).attr("type"), "Verify that you can change the type of an input element that isn't in the DOM" );

	check = jQuery("<input />");
	thrown = true;
	try {
		check.attr("type","checkbox");
	} catch(e) {
		thrown = false;
	}
	ok( thrown, "Exception thrown when trying to change type property" );
	equal( "checkbox", check.attr("type"), "Verify that you can change the type of an input element that isn't in the DOM" );

	var button = jQuery("#button");
	thrown = false;
	try {
		button.attr("type","submit");
	} catch(e) {
		thrown = true;
	}
	ok( thrown, "Exception thrown when trying to change type property" );
	equal( "button", button.attr("type"), "Verify that you can't change the type of a button element" );

	var $radio = jQuery("<input>", { "value": "sup", "type": "radio" }).appendTo("#testForm");
	equal( $radio.val(), "sup", "Value is not reset when type is set after value on a radio" );

	// Setting attributes on svg elements (bug #3116)
	var $svg = jQuery(
		"<svg xmlns='http://www.w3.org/2000/svg'   xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1'  baseProfile='full' width='200' height='200'>" +

			"<circle cx='200' cy='200' r='150' />" +
			"</svg>"
		).appendTo("body");
	equal( $svg.attr("cx", 100).attr("cx"), "100", "Set attribute on svg element" );
	$svg.remove();

	// undefined values are chainable
	jQuery("#name").attr("maxlength", "5").removeAttr("nonexisting");
	equal( typeof jQuery("#name").attr("maxlength", undefined), "object", ".attr('attribute', undefined) is chainable (#5571)" );
	equal( jQuery("#name").attr("maxlength", undefined).attr("maxlength"), "5", ".attr('attribute', undefined) does not change value (#5571)" );
	equal( jQuery("#name").attr("nonexisting", undefined).attr("nonexisting"), undefined, ".attr('attribute', undefined) does not create attribute (#5571)" );
});

test("attr(jquery_method)", function(){

	var $elem = jQuery("<div />"),
		elem = $elem[0],
		expected = 2,
		attrObj = {};

	if ( jQuery.fn.width ) {
		expected += 2;
		attrObj["width"] = 10;
	}

	if ( jQuery.fn.offset ) {
		expected += 2;
		attrObj["offset"] = { "top": 1, "left": 0 };
	}

	if ( jQuery.css ) {
		expected += 3;
		attrObj["css"] = { "paddingLeft": 1, "paddingRight": 1 };
	}

	expect( expected );

	// one at a time
	$elem.attr( { "html": "foo" }, true );
	equal( elem.innerHTML, "foo", "attr(html)" );

	$elem.attr( { "text": "bar" }, true );
	equal( elem.innerHTML, "bar", "attr(text)" );

	// Multiple attributes
	$elem.attr( attrObj, true );

	if ( jQuery.fn.width ) {
		equal( elem.style.width, "10px", "attr({width:})" );

		$elem.attr( { "height": 10 }, true );
		equal( elem.style.height, "10px", "attr(height)" );
	}

	if ( jQuery.fn.offset ) {
		equal( elem.style.top, "1px", "attr({offset:})" );

		$elem.attr( { offset: { top: 1, left: 1 } }, true );
		equal( elem.style.left, "1px", "attr(offset)" );
	}

	if ( jQuery.css ) {
		equal( elem.style.paddingLeft, "1px", "attr({css:})" );
		equal( elem.style.paddingRight, "1px", "attr({css:})" );

		$elem.attr( { "css": { "color": "red" } }, true );
		ok( /^(#ff0000|red)$/i.test( elem.style.color ), "attr(css)" );
	}
});

test("attr(String, Object) - Loaded via XML document", function() {
	expect( 2 );
	var xml = createDashboardXML();
	var titles = [];
	jQuery( "tab", xml ).each(function() {
		titles.push( jQuery(this).attr("title") );
	});
	equal( titles[0], "Location", "attr() in XML context: Check first title" );
	equal( titles[1], "Users", "attr() in XML context: Check second title" );
});

test("attr('tabindex')", function() {
	expect( 8 );

	// elements not natively tabbable
	equal( jQuery("#listWithTabIndex").attr("tabindex"), "5", "not natively tabbable, with tabindex set to 0" );
	equal( jQuery("#divWithNoTabIndex").attr("tabindex"), undefined, "not natively tabbable, no tabindex set" );

	// anchor with href
	equal( jQuery("#linkWithNoTabIndex").attr("tabindex"), undefined, "anchor with href, no tabindex set" );
	equal( jQuery("#linkWithTabIndex").attr("tabindex"), "2", "anchor with href, tabindex set to 2" );
	equal( jQuery("#linkWithNegativeTabIndex").attr("tabindex"), "-1", "anchor with href, tabindex set to -1" );

	// anchor without href
	equal( jQuery("#linkWithNoHrefWithNoTabIndex").attr("tabindex"), undefined, "anchor without href, no tabindex set" );
	equal( jQuery("#linkWithNoHrefWithTabIndex").attr("tabindex"), "1", "anchor without href, tabindex set to 2" );
	equal( jQuery("#linkWithNoHrefWithNegativeTabIndex").attr("tabindex"), "-1", "anchor without href, no tabindex set" );
});

test("attr('tabindex', value)", function() {
	expect( 9 );

	var element = jQuery("#divWithNoTabIndex");
	equal( element.attr("tabindex"), undefined, "start with no tabindex" );

	// set a positive string
	element.attr("tabindex", "1");
	equal( element.attr("tabindex"), "1", "set tabindex to 1 (string)" );

	// set a zero string
	element.attr("tabindex", "0");
	equal( element.attr("tabindex"), "0", "set tabindex to 0 (string)" );

	// set a negative string
	element.attr("tabindex", "-1");
	equal( element.attr("tabindex"), "-1", "set tabindex to -1 (string)" );

	// set a positive number
	element.attr("tabindex", 1);
	equal( element.attr("tabindex"), "1", "set tabindex to 1 (number)" );

	// set a zero number
	element.attr("tabindex", 0);
	equal(element.attr("tabindex"), "0", "set tabindex to 0 (number)");

	// set a negative number
	element.attr("tabindex", -1);
	equal( element.attr("tabindex"), "-1", "set tabindex to -1 (number)" );

	element = jQuery("#linkWithTabIndex");
	equal( element.attr("tabindex"), "2", "start with tabindex 2" );

	element.attr("tabindex", -1);
	equal( element.attr("tabindex"), "-1", "set negative tabindex" );
});

test("removeAttr(String)", function() {
	expect( 12 );
	var $first;

	equal( jQuery("#mark").removeAttr( "cl***REMOVED***" ).attr("cl***REMOVED***"), undefined, "remove cl***REMOVED***" );
	equal( jQuery("#form").removeAttr("id").attr("id"), undefined, "Remove id" );
	equal( jQuery("#foo").attr("style", "position:absolute;").removeAttr("style").attr("style"), undefined, "Check removing style attribute" );
	equal( jQuery("#form").attr("style", "position:absolute;").removeAttr("style").attr("style"), undefined, "Check removing style attribute on a form" );
	equal( jQuery("<div style='position: absolute'></div>").appendTo("#foo").removeAttr("style").prop("style").cssText, "", "Check removing style attribute (#9699 Webkit)" );
	equal( jQuery("#fx-test-group").attr("height", "3px").removeAttr("height").get(0).style.height, "1px", "Removing height attribute has no effect on height set with style attribute" );

	jQuery("#check1").removeAttr("checked").prop("checked", true).removeAttr("checked");
	equal( document.getElementById("check1").checked, false, "removeAttr sets boolean properties to false" );
	jQuery("#text1").prop("readOnly", true).removeAttr("readonly");
	equal( document.getElementById("text1").readOnly, false, "removeAttr sets boolean properties to false" );

	jQuery("#option2c").removeAttr("selected");
	equal( jQuery("#option2d").attr("selected"), "selected", "Removing `selected` from an option that is not selected does not remove selected from the currently selected option (#10870)");

	try {
		$first = jQuery("#first").attr("contenteditable", "true").removeAttr("contenteditable");
		equal( $first.attr('contenteditable'), undefined, "Remove the contenteditable attribute" );
	} catch(e) {
		ok( false, "Removing contenteditable threw an error (#10429)" );
	}
	
	$first = jQuery("<div Case='mixed'></div>");
	equal( $first.attr("Case"), "mixed", "case of attribute doesn't matter" );
	$first.removeAttr("Case");
	// IE 6/7 return empty string here, not undefined
	ok( !$first.attr("Case"), "mixed-case attribute was removed" );
});

test("removeAttr(String) in XML", function() {
	expect( 7 );
	var xml = createDashboardXML(),
		iwt = jQuery( "infowindowtab", xml );

	equal( iwt.attr("normal"), "ab", "Check initial value" );
	iwt.removeAttr("Normal");
	equal( iwt.attr("normal"), "ab", "Should still be there" );
	iwt.removeAttr("normal");
	equal( iwt.attr("normal"), undefined, "Removed" );

	equal( iwt.attr("mixedCase"), "yes", "Check initial value" );
	equal( iwt.attr("mixedcase"), undefined, "toLowerCase not work good" );
	iwt.removeAttr("mixedcase");
	equal( iwt.attr("mixedCase"), "yes", "Should still be there" );
	iwt.removeAttr("mixedCase");
	equal( iwt.attr("mixedCase"), undefined, "Removed" );
});

test("removeAttr(Multi String, variable space width)", function() {
	expect(8);

	var div = jQuery("<div id='a' alt='b' title='c' rel='d'></div>"),
		tests = {
			id: "a",
			alt: "b",
			title: "c",
			rel: "d"
		};

	jQuery.each( tests, function( key, val ) {
		equal( div.attr(key), val, "Attribute `" + key + "` exists, and has a value of `" + val + "`" );
	});

	div.removeAttr( "id   alt title  rel  " );

	jQuery.each( tests, function( key, val ) {
		equal( div.attr(key), undefined, "Attribute `" + key + "` was removed" );
	});
});

test("prop(String, Object)", function() {
	expect(31);

	equal( jQuery("#text1").prop("value"), "Test", "Check for value attribute" );
	equal( jQuery("#text1").prop("value", "Test2").prop("defaultValue"), "Test", "Check for defaultValue attribute" );
	equal( jQuery("#select2").prop("selectedIndex"), 3, "Check for selectedIndex attribute" );
	equal( jQuery("#foo").prop("nodeName").toUpperCase(), "DIV", "Check for nodeName attribute" );
	equal( jQuery("#foo").prop("tagName").toUpperCase(), "DIV", "Check for tagName attribute" );
	equal( jQuery("<option/>").prop("selected"), false, "Check selected attribute on disconnected element." );

	equal( jQuery("#listWithTabIndex").prop("tabindex"), 5, "Check retrieving tabindex" );
	jQuery("#text1").prop("readonly", true);
	equal( document.getElementById("text1").readOnly, true, "Check setting readOnly property with 'readonly'" );
	equal( jQuery("#label-for").prop("for"), "action", "Check retrieving htmlFor" );
	jQuery("#text1").prop("cl***REMOVED***", "test");
	equal( document.getElementById("text1").cl***REMOVED***Name, "test", "Check setting cl***REMOVED***Name with 'cl***REMOVED***'" );
	equal( jQuery("#text1").prop("maxlength"), 30, "Check retrieving maxLength" );
	jQuery("#table").prop("cellspacing", 1);
	equal( jQuery("#table").prop("cellSpacing"), "1", "Check setting and retrieving cellSpacing" );
	jQuery("#table").prop("cellpadding", 1);
	equal( jQuery("#table").prop("cellPadding"), "1", "Check setting and retrieving cellPadding" );
	jQuery("#table").prop("rowspan", 1);
	equal( jQuery("#table").prop("rowSpan"), 1, "Check setting and retrieving rowSpan" );
	jQuery("#table").prop("colspan", 1);
	equal( jQuery("#table").prop("colSpan"), 1, "Check setting and retrieving colSpan" );
	jQuery("#table").prop("usemap", 1);
	equal( jQuery("#table").prop("useMap"), 1, "Check setting and retrieving useMap" );
	jQuery("#table").prop("frameborder", 1);
	equal( jQuery("#table").prop("frameBorder"), 1, "Check setting and retrieving frameBorder" );
	QUnit.reset();

	var body = document.body,
		$body = jQuery( body );

	ok( $body.prop("nextSibling") === null, "Make sure a null expando returns null" );
	body["foo"] = "bar";
	equal( $body.prop("foo"), "bar", "Make sure the expando is preferred over the dom attribute" );
	body["foo"] = undefined;
	ok( $body.prop("foo") === undefined, "Make sure the expando is preferred over the dom attribute, even if undefined" );

	var select = document.createElement("select"), optgroup = document.createElement("optgroup"), option = document.createElement("option");
	optgroup.appendChild( option );
	select.appendChild( optgroup );

	equal( jQuery(option).prop("selected"), true, "Make sure that a single option is selected, even when in an optgroup." );
	equal( jQuery(document).prop("nodeName"), "#document", "prop works correctly on document nodes (bug #7451)." );

	var attributeNode = document.createAttribute("irrelevant"),
		commentNode = document.createComment("some comment"),
		textNode = document.createTextNode("some text"),
		obj = {};
	jQuery.each( [document, attributeNode, commentNode, textNode, obj, "#firstp"], function( i, ele ) {
		strictEqual( jQuery(ele).prop("nonexisting"), undefined, "prop works correctly for non existing attributes (bug #7500)." );
	});

	obj = {};
	jQuery.each( [document, obj], function( i, ele ) {
		var $ele = jQuery( ele );
		$ele.prop( "nonexisting", "foo" );
		equal( $ele.prop("nonexisting"), "foo", "prop(name, value) works correctly for non existing attributes (bug #7500)." );
	});
	jQuery( document ).removeProp("nonexisting");

	var $form = jQuery("#form").prop("enctype", "multipart/form-data");
	equal( $form.prop("enctype"), "multipart/form-data", "Set the enctype of a form (encoding in IE6/7 #6743)" );
});

test("prop('tabindex')", function() {
	expect(8);

	// elements not natively tabbable
	equal(jQuery("#listWithTabIndex").prop("tabindex"), 5, "not natively tabbable, with tabindex set to 0");
	equal(jQuery("#divWithNoTabIndex").prop("tabindex"), undefined, "not natively tabbable, no tabindex set");

	// anchor with href
	equal(jQuery("#linkWithNoTabIndex").prop("tabindex"), 0, "anchor with href, no tabindex set");
	equal(jQuery("#linkWithTabIndex").prop("tabindex"), 2, "anchor with href, tabindex set to 2");
	equal(jQuery("#linkWithNegativeTabIndex").prop("tabindex"), -1, "anchor with href, tabindex set to -1");

	// anchor without href
	equal(jQuery("#linkWithNoHrefWithNoTabIndex").prop("tabindex"), undefined, "anchor without href, no tabindex set");
	equal(jQuery("#linkWithNoHrefWithTabIndex").prop("tabindex"), 1, "anchor without href, tabindex set to 2");
	equal(jQuery("#linkWithNoHrefWithNegativeTabIndex").prop("tabindex"), -1, "anchor without href, no tabindex set");
});

test("prop('tabindex', value)", 10, function() {

	var element = jQuery("#divWithNoTabIndex"),
		clone;

	equal(element.prop("tabindex"), undefined, "start with no tabindex");

	// set a positive string
	element.prop( "tabindex", "1" );
	equal( element.prop("tabindex"), 1, "set tabindex to 1 (string)" );

	// set a zero string
	element.prop( "tabindex", "0" );
	equal( element.prop("tabindex"), 0, "set tabindex to 0 (string)" );

	// set a negative string
	element.prop( "tabindex", "-1" );
	equal( element.prop("tabindex"), -1, "set tabindex to -1 (string)" );

	// set a positive number
	element.prop( "tabindex", 1 );
	equal( element.prop("tabindex"), 1, "set tabindex to 1 (number)" );

	// set a zero number
	element.prop( "tabindex", 0 );
	equal( element.prop("tabindex"), 0, "set tabindex to 0 (number)" );

	// set a negative number
	element.prop( "tabindex", -1 );
	equal( element.prop("tabindex"), -1, "set tabindex to -1 (number)" );

	element = jQuery("#linkWithTabIndex");
	equal( element.prop("tabindex"), 2, "start with tabindex 2" );

	element.prop( "tabindex", -1 );
	equal( element.prop("tabindex"), -1, "set negative tabindex" );

	clone = element.clone();
	clone.prop( "tabindex", 1 );
	equal( clone[ 0 ].getAttribute("tabindex"), "1", "set tabindex on cloned element" );
});

test("removeProp(String)", function() {
	expect(6);
	var attributeNode = document.createAttribute("irrelevant"),
		commentNode = document.createComment("some comment"),
		textNode = document.createTextNode("some text"),
		obj = {};

	strictEqual( jQuery( "#firstp" ).prop( "nonexisting", "foo" ).removeProp( "nonexisting" )[0]["nonexisting"], undefined, "removeprop works correctly on DOM element nodes" );

	jQuery.each( [document, obj], function( i, ele ) {
		var $ele = jQuery( ele );
		$ele.prop( "nonexisting", "foo" ).removeProp( "nonexisting" );
		strictEqual( ele["nonexisting"], undefined, "removeProp works correctly on non DOM element nodes (bug #7500)." );
	});
	jQuery.each( [commentNode, textNode, attributeNode], function( i, ele ) {
		var $ele = jQuery( ele );
		$ele.prop( "nonexisting", "foo" ).removeProp( "nonexisting" );
		strictEqual( ele["nonexisting"], undefined, "removeProp works correctly on non DOM element nodes (bug #7500)." );
	});
});

test("val()", function() {
	expect( 21 + ( jQuery.fn.serialize ? 6 : 0 ) );

	document.getElementById("text1").value = "bla";
	equal( jQuery("#text1").val(), "bla", "Check for modified value of input element" );

	QUnit.reset();

	equal( jQuery("#text1").val(), "Test", "Check for value of input element" );
	// ticket #1714 this caused a JS error in IE
	equal( jQuery("#first").val(), "", "Check a paragraph element to see if it has a value" );
	ok( jQuery([]).val() === undefined, "Check an empty jQuery object will return undefined from val" );

	equal( jQuery("#select2").val(), "3", "Call val() on a single=\"single\" select" );

	deepEqual( jQuery("#select3").val(), ["1", "2"], "Call val() on a multiple=\"multiple\" select" );

	equal( jQuery("#option3c").val(), "2", "Call val() on a option element with value" );

	equal( jQuery("#option3a").val(), "", "Call val() on a option element with empty value" );

	equal( jQuery("#option3e").val(), "no value", "Call val() on a option element with no value attribute" );

	equal( jQuery("#option3a").val(), "", "Call val() on a option element with no value attribute" );

	jQuery("#select3").val("");
	deepEqual( jQuery("#select3").val(), [""], "Call val() on a multiple=\"multiple\" select" );

	deepEqual( jQuery("#select4").val(), [], "Call val() on multiple=\"multiple\" select with all disabled options" );

	jQuery("#select4 optgroup").add("#select4 > [disabled]").attr("disabled", false);
	deepEqual( jQuery("#select4").val(), ["2", "3"], "Call val() on multiple=\"multiple\" select with some disabled options" );

	jQuery("#select4").attr("disabled", true);
	deepEqual( jQuery("#select4").val(), ["2", "3"], "Call val() on disabled multiple=\"multiple\" select" );

	equal( jQuery("#select5").val(), "3", "Check value on ambiguous select." );

	jQuery("#select5").val(1);
	equal( jQuery("#select5").val(), "1", "Check value on ambiguous select." );

	jQuery("#select5").val(3);
	equal( jQuery("#select5").val(), "3", "Check value on ambiguous select." );

	strictEqual(
		jQuery("<select name='select12584' id='select12584'><option value='1' disabled='disabled'>1</option></select>").val(),
		null,
		"Select-one with only option disabled (#12584)"
	);

	if ( jQuery.fn.serialize ) {
		var checks = jQuery("<input type='checkbox' name='test' value='1'/><input type='checkbox' name='test' value='2'/><input type='checkbox' name='test' value=''/><input type='checkbox' name='test'/>").appendTo("#form");

		deepEqual( checks.serialize(), "", "Get unchecked values." );

		equal( checks.eq(3).val(), "on", "Make sure a value of 'on' is provided if none is specified." );

		checks.val([ "2" ]);
		deepEqual( checks.serialize(), "test=2", "Get a single checked value." );

		checks.val([ "1", "" ]);
		deepEqual( checks.serialize(), "test=1&test=", "Get multiple checked values." );

		checks.val([ "", "2" ]);
		deepEqual( checks.serialize(), "test=2&test=", "Get multiple checked values." );

		checks.val([ "1", "on" ]);
		deepEqual( checks.serialize(), "test=1&test=on", "Get multiple checked values." );

		checks.remove();
	}

	var $button = jQuery("<button value='foobar'>text</button>").insertAfter("#button");
	equal( $button.val(), "foobar", "Value retrieval on a button does not return innerHTML" );
	equal( $button.val("baz").html(), "text", "Setting the value does not change innerHTML" );

	equal( jQuery("<option/>").val("test").attr("value"), "test", "Setting value sets the value attribute" );
});

if ( "value" in document.createElement("meter") &&
			"value" in document.createElement("progress") ) {

	test("val() respects numbers without exception (Bug #9319)", function() {

		expect(4);

		var $meter = jQuery("<meter min='0' max='10' value='5.6'></meter>"),
			$progress = jQuery("<progress max='10' value='1.5'></progress>");

		try {
			equal( typeof $meter.val(), "number", "meter, returns a number and does not throw exception" );
			equal( $meter.val(), $meter[0].value, "meter, api matches host and does not throw exception" );

			equal( typeof $progress.val(), "number", "progress, returns a number and does not throw exception" );
			equal( $progress.val(), $progress[0].value, "progress, api matches host and does not throw exception" );

		} catch(e) {}

		$meter.remove();
		$progress.remove();
	});
}

var testVal = function(valueObj) {
	expect(8);

	QUnit.reset();
	jQuery("#text1").val(valueObj( "test" ));
	equal( document.getElementById("text1").value, "test", "Check for modified (via val(String)) value of input element" );

	jQuery("#text1").val(valueObj( undefined ));
	equal( document.getElementById("text1").value, "", "Check for modified (via val(undefined)) value of input element" );

	jQuery("#text1").val(valueObj( 67 ));
	equal( document.getElementById("text1").value, "67", "Check for modified (via val(Number)) value of input element" );

	jQuery("#text1").val(valueObj( null ));
	equal( document.getElementById("text1").value, "", "Check for modified (via val(null)) value of input element" );

	var $select1 = jQuery("#select1");
	$select1.val(valueObj( "3" ));
	equal( $select1.val(), "3", "Check for modified (via val(String)) value of select element" );

	$select1.val(valueObj( 2 ));
	equal( $select1.val(), "2", "Check for modified (via val(Number)) value of select element" );

	$select1.append("<option value='4'>four</option>");
	$select1.val(valueObj( 4 ));
	equal( $select1.val(), "4", "Should be possible to set the val() to a newly created option" );

	// using contents will get comments regular, text, and comment nodes
	var j = jQuery("#nonnodes").contents();
	j.val(valueObj( "asdf" ));
	equal( j.val(), "asdf", "Check node,textnode,comment with val()" );
	j.removeAttr("value");
};

test("val(String/Number)", function() {
	testVal(bareObj);
});

test("val(Function)", function() {
	testVal(functionReturningObj);
});

test( "val(Array of Numbers) (Bug #7123)", function() {
	expect(4);
	jQuery("#form").append("<input type='checkbox' name='arrayTest' value='1' /><input type='checkbox' name='arrayTest' value='2' /><input type='checkbox' name='arrayTest' value='3' checked='checked' /><input type='checkbox' name='arrayTest' value='4' />");
	var elements = jQuery("input[name=arrayTest]").val([ 1, 2 ]);
	ok( elements[0].checked, "First element was checked" );
	ok( elements[1].checked, "Second element was checked" );
	ok( !elements[2].checked, "Third element was unchecked" );
	ok( !elements[3].checked, "Fourth element remained unchecked" );

	elements.remove();
});

test("val(Function) with incoming value", function() {
	expect(10);

	QUnit.reset();
	var oldVal = jQuery("#text1").val();

	jQuery("#text1").val(function(i, val) {
		equal( val, oldVal, "Make sure the incoming value is correct." );
		return "test";
	});

	equal( document.getElementById("text1").value, "test", "Check for modified (via val(String)) value of input element" );

	oldVal = jQuery("#text1").val();

	jQuery("#text1").val(function(i, val) {
		equal( val, oldVal, "Make sure the incoming value is correct." );
		return 67;
	});

	equal( document.getElementById("text1").value, "67", "Check for modified (via val(Number)) value of input element" );

	oldVal = jQuery("#select1").val();

	jQuery("#select1").val(function(i, val) {
		equal( val, oldVal, "Make sure the incoming value is correct." );
		return "3";
	});

	equal( jQuery("#select1").val(), "3", "Check for modified (via val(String)) value of select element" );

	oldVal = jQuery("#select1").val();

	jQuery("#select1").val(function(i, val) {
		equal( val, oldVal, "Make sure the incoming value is correct." );
		return 2;
	});

	equal( jQuery("#select1").val(), "2", "Check for modified (via val(Number)) value of select element" );

	jQuery("#select1").append("<option value='4'>four</option>");

	oldVal = jQuery("#select1").val();

	jQuery("#select1").val(function(i, val) {
		equal( val, oldVal, "Make sure the incoming value is correct." );
		return 4;
	});

	equal( jQuery("#select1").val(), "4", "Should be possible to set the val() to a newly created option" );
});

// testing if a form.reset() breaks a subsequent call to a select element's .val() (in IE only)
test("val(select) after form.reset() (Bug #2551)", function() {
	expect(3);

	jQuery("<form id='kk' name='kk'><select id='kkk'><option value='cf'>cf</option><option value='gf'>gf</option></select></form>").appendTo("#qunit-fixture");

	jQuery("#kkk").val( "gf" );

	document["kk"].reset();

	equal( jQuery("#kkk")[0].value, "cf", "Check value of select after form reset." );
	equal( jQuery("#kkk").val(), "cf", "Check value of select after form reset." );

	// re-verify the multi-select is not broken (after form.reset) by our fix for single-select
	deepEqual( jQuery("#select3").val(), ["1", "2"], "Call val() on a multiple=\"multiple\" select" );

	jQuery("#kk").remove();
});

var testAddCl***REMOVED*** = function(valueObj) {
	expect(9);

	var div = jQuery("div");
	div.addCl***REMOVED***( valueObj("test") );
	var p***REMOVED*** = true;
	for ( var i = 0; i < div.size(); i++ ) {
		if ( !~div.get(i).cl***REMOVED***Name.indexOf("test") ) {
			p***REMOVED*** = false;
		}
	}
	ok( p***REMOVED***, "Add Cl***REMOVED***" );

	// using contents will get regular, text, and comment nodes
	var j = jQuery("#nonnodes").contents();
	j.addCl***REMOVED***( valueObj("asdf") );
	ok( j.hasCl***REMOVED***("asdf"), "Check node,textnode,comment for addCl***REMOVED***" );

	div = jQuery("<div/>");

	div.addCl***REMOVED***( valueObj("test") );
	equal( div.attr("cl***REMOVED***"), "test", "Make sure there's no extra whitespace." );

	div.attr("cl***REMOVED***", " foo");
	div.addCl***REMOVED***( valueObj("test") );
	equal( div.attr("cl***REMOVED***"), "foo test", "Make sure there's no extra whitespace." );

	div.attr("cl***REMOVED***", "foo");
	div.addCl***REMOVED***( valueObj("bar baz") );
	equal( div.attr("cl***REMOVED***"), "foo bar baz", "Make sure there isn't too much trimming." );

	div.removeCl***REMOVED***();
	div.addCl***REMOVED***( valueObj("foo") ).addCl***REMOVED***( valueObj("foo") );
	equal( div.attr("cl***REMOVED***"), "foo", "Do not add the same cl***REMOVED*** twice in separate calls." );

	div.addCl***REMOVED***( valueObj("fo") );
	equal( div.attr("cl***REMOVED***"), "foo fo", "Adding a similar cl***REMOVED*** does not get interrupted." );
	div.removeCl***REMOVED***().addCl***REMOVED***("wrap2");
	ok( div.addCl***REMOVED***("wrap").hasCl***REMOVED***("wrap"), "Can add similarly named cl***REMOVED***es");

	div.removeCl***REMOVED***();
	div.addCl***REMOVED***( valueObj("bar bar") );
	equal( div.attr("cl***REMOVED***"), "bar", "Do not add the same cl***REMOVED*** twice in the same call." );
};

test("addCl***REMOVED***(String)", function() {
	testAddCl***REMOVED***(bareObj);
});

test("addCl***REMOVED***(Function)", function() {
	testAddCl***REMOVED***(functionReturningObj);
});

test("addCl***REMOVED***(Function) with incoming value", function() {
	expect(48);
	var div = jQuery("div"), old = div.map(function(){
		return jQuery(this).attr("cl***REMOVED***") || "";
	});

	div.addCl***REMOVED***(function(i, val) {
		if ( this.id !== "_firebugConsole") {
			equal( val, old[i], "Make sure the incoming value is correct." );
			return "test";
		}
	});

	var p***REMOVED*** = true;
	for ( var i = 0; i < div.length; i++ ) {
		if ( div.get(i).cl***REMOVED***Name.indexOf("test") == -1 ) {
			p***REMOVED*** = false;
		}
	}
	ok( p***REMOVED***, "Add Cl***REMOVED***" );
});

var testRemoveCl***REMOVED*** = function(valueObj) {
	expect(7);

	var $divs = jQuery("div");

	$divs.addCl***REMOVED***("test").removeCl***REMOVED***( valueObj("test") );

	ok( !$divs.is(".test"), "Remove Cl***REMOVED***" );

	QUnit.reset();
	$divs = jQuery("div");

	$divs.addCl***REMOVED***("test").addCl***REMOVED***("foo").addCl***REMOVED***("bar");
	$divs.removeCl***REMOVED***( valueObj("test") ).removeCl***REMOVED***( valueObj("bar") ).removeCl***REMOVED***( valueObj("foo") );

	ok( !$divs.is(".test,.bar,.foo"), "Remove multiple cl***REMOVED***es" );

	QUnit.reset();
	$divs = jQuery("div");

	// Make sure that a null value doesn't cause problems
	$divs.eq(0).addCl***REMOVED***("test").removeCl***REMOVED***( valueObj(null) );
	ok( $divs.eq(0).is(".test"), "Null value p***REMOVED***ed to removeCl***REMOVED***" );

	$divs.eq(0).addCl***REMOVED***("test").removeCl***REMOVED***( valueObj("") );
	ok( $divs.eq(0).is(".test"), "Empty string p***REMOVED***ed to removeCl***REMOVED***" );

	// using contents will get regular, text, and comment nodes
	var j = jQuery("#nonnodes").contents();
	j.removeCl***REMOVED***( valueObj("asdf") );
	ok( !j.hasCl***REMOVED***("asdf"), "Check node,textnode,comment for removeCl***REMOVED***" );

	var div = document.createElement("div");
	div.cl***REMOVED***Name = " test foo ";

	jQuery(div).removeCl***REMOVED***( valueObj("foo") );
	equal( div.cl***REMOVED***Name, "test", "Make sure remaining cl***REMOVED***Name is trimmed." );

	div.cl***REMOVED***Name = " test ";

	jQuery(div).removeCl***REMOVED***( valueObj("test") );
	equal( div.cl***REMOVED***Name, "", "Make sure there is nothing left after everything is removed." );
};

test("removeCl***REMOVED***(String) - simple", function() {
	testRemoveCl***REMOVED***(bareObj);
});

test("removeCl***REMOVED***(Function) - simple", function() {
	testRemoveCl***REMOVED***(functionReturningObj);
});

test("removeCl***REMOVED***(Function) with incoming value", function() {
	expect(48);

	var $divs = jQuery("div").addCl***REMOVED***("test"), old = $divs.map(function(){
		return jQuery(this).attr("cl***REMOVED***");
	});

	$divs.removeCl***REMOVED***(function(i, val) {
		if ( this.id !== "_firebugConsole" ) {
			equal( val, old[i], "Make sure the incoming value is correct." );
			return "test";
		}
	});

	ok( !$divs.is(".test"), "Remove Cl***REMOVED***" );

	QUnit.reset();
});

test("removeCl***REMOVED***() removes duplicates", function() {
	expect(1);

	var $div = jQuery( jQuery.parseHTML("<div cl***REMOVED***='x x x'></div>") );

	$div.removeCl***REMOVED***("x");

	ok( !$div.hasCl***REMOVED***("x"), "Element with multiple same cl***REMOVED***es does not escape the wrath of removeCl***REMOVED***()" );
});

var testToggleCl***REMOVED*** = function(valueObj) {
	expect(17);

	var e = jQuery("#firstp");
	ok( !e.is(".test"), "Assert cl***REMOVED*** not present" );
	e.toggleCl***REMOVED***( valueObj("test") );
	ok( e.is(".test"), "Assert cl***REMOVED*** present" );
	e.toggleCl***REMOVED***( valueObj("test") );
	ok( !e.is(".test"), "Assert cl***REMOVED*** not present" );

	// cl***REMOVED*** name with a boolean
	e.toggleCl***REMOVED***( valueObj("test"), false );
	ok( !e.is(".test"), "Assert cl***REMOVED*** not present" );
	e.toggleCl***REMOVED***( valueObj("test"), true );
	ok( e.is(".test"), "Assert cl***REMOVED*** present" );
	e.toggleCl***REMOVED***( valueObj("test"), false );
	ok( !e.is(".test"), "Assert cl***REMOVED*** not present" );

	// multiple cl***REMOVED*** names
	e.addCl***REMOVED***("testA testB");
	ok( (e.is(".testA.testB")), "Assert 2 different cl***REMOVED***es present" );
	e.toggleCl***REMOVED***( valueObj("testB testC") );
	ok( (e.is(".testA.testC") && !e.is(".testB")), "Assert 1 cl***REMOVED*** added, 1 cl***REMOVED*** removed, and 1 cl***REMOVED*** kept" );
	e.toggleCl***REMOVED***( valueObj("testA testC") );
	ok( (!e.is(".testA") && !e.is(".testB") && !e.is(".testC")), "Assert no cl***REMOVED*** present" );

	// toggleCl***REMOVED*** storage
	e.toggleCl***REMOVED***(true);
	ok( e[0].cl***REMOVED***Name === "", "Assert cl***REMOVED*** is empty (data was empty)" );
	e.addCl***REMOVED***("testD testE");
	ok( e.is(".testD.testE"), "Assert cl***REMOVED*** present" );
	e.toggleCl***REMOVED***();
	ok( !e.is(".testD.testE"), "Assert cl***REMOVED*** not present" );
	ok( jQuery._data(e[0], "__cl***REMOVED***Name__") === "testD testE", "Assert data was stored" );
	e.toggleCl***REMOVED***();
	ok( e.is(".testD.testE"), "Assert cl***REMOVED*** present (restored from data)" );
	e.toggleCl***REMOVED***(false);
	ok( !e.is(".testD.testE"), "Assert cl***REMOVED*** not present" );
	e.toggleCl***REMOVED***(true);
	ok( e.is(".testD.testE"), "Assert cl***REMOVED*** present (restored from data)" );
	e.toggleCl***REMOVED***();
	e.toggleCl***REMOVED***(false);
	e.toggleCl***REMOVED***();
	ok( e.is(".testD.testE"), "Assert cl***REMOVED*** present (restored from data)" );

	// Cleanup
	e.removeCl***REMOVED***("testD");
	jQuery.removeData(e[0], "__cl***REMOVED***Name__", true);
};

test("toggleCl***REMOVED***(String|boolean|undefined[, boolean])", function() {
	testToggleCl***REMOVED***(bareObj);
});

test("toggleCl***REMOVED***(Function[, boolean])", function() {
	testToggleCl***REMOVED***(functionReturningObj);
});

test("toggleCl***REMOVED***(Fucntion[, boolean]) with incoming value", function() {
	expect(14);

	var e = jQuery("#firstp"), old = e.attr("cl***REMOVED***") || "";
	ok( !e.is(".test"), "Assert cl***REMOVED*** not present" );

	e.toggleCl***REMOVED***(function(i, val) {
		equal( old, val, "Make sure the incoming value is correct." );
		return "test";
	});
	ok( e.is(".test"), "Assert cl***REMOVED*** present" );

	old = e.attr("cl***REMOVED***");

	e.toggleCl***REMOVED***(function(i, val) {
		equal( old, val, "Make sure the incoming value is correct." );
		return "test";
	});
	ok( !e.is(".test"), "Assert cl***REMOVED*** not present" );

	old = e.attr("cl***REMOVED***") || "";

	// cl***REMOVED*** name with a boolean
	e.toggleCl***REMOVED***(function(i, val, state) {
		equal( old, val, "Make sure the incoming value is correct." );
		equal( state, false, "Make sure that the state is p***REMOVED***ed in." );
		return "test";
	}, false );
	ok( !e.is(".test"), "Assert cl***REMOVED*** not present" );

	old = e.attr("cl***REMOVED***") || "";

	e.toggleCl***REMOVED***(function(i, val, state) {
		equal( old, val, "Make sure the incoming value is correct." );
		equal( state, true, "Make sure that the state is p***REMOVED***ed in." );
		return "test";
	}, true );
	ok( e.is(".test"), "Assert cl***REMOVED*** present" );

	old = e.attr("cl***REMOVED***");

	e.toggleCl***REMOVED***(function(i, val, state) {
		equal( old, val, "Make sure the incoming value is correct." );
		equal( state, false, "Make sure that the state is p***REMOVED***ed in." );
		return "test";
	}, false );
	ok( !e.is(".test"), "Assert cl***REMOVED*** not present" );

	// Cleanup
	e.removeCl***REMOVED***("test");
	jQuery.removeData(e[0], "__cl***REMOVED***Name__", true);
});

test("addCl***REMOVED***, removeCl***REMOVED***, hasCl***REMOVED***", function() {
	expect(17);

	var jq = jQuery("<p>Hi</p>"), x = jq[0];

	jq.addCl***REMOVED***("hi");
	equal( x.cl***REMOVED***Name, "hi", "Check single added cl***REMOVED***" );

	jq.addCl***REMOVED***("foo bar");
	equal( x.cl***REMOVED***Name, "hi foo bar", "Check more added cl***REMOVED***es" );

	jq.removeCl***REMOVED***();
	equal( x.cl***REMOVED***Name, "", "Remove all cl***REMOVED***es" );

	jq.addCl***REMOVED***("hi foo bar");
	jq.removeCl***REMOVED***("foo");
	equal( x.cl***REMOVED***Name, "hi bar", "Check removal of one cl***REMOVED***" );

	ok( jq.hasCl***REMOVED***("hi"), "Check has1" );
	ok( jq.hasCl***REMOVED***("bar"), "Check has2" );

	jq = jQuery("<p cl***REMOVED***='cl***REMOVED***1\ncl***REMOVED***2\tcla.ss3\n\rcl***REMOVED***4'></p>");

	ok( jq.hasCl***REMOVED***("cl***REMOVED***1"), "Check hasCl***REMOVED*** with line feed" );
	ok( jq.is(".cl***REMOVED***1"), "Check is with line feed" );
	ok( jq.hasCl***REMOVED***("cl***REMOVED***2"), "Check hasCl***REMOVED*** with tab" );
	ok( jq.is(".cl***REMOVED***2"), "Check is with tab" );
	ok( jq.hasCl***REMOVED***("cla.ss3"), "Check hasCl***REMOVED*** with dot" );
	ok( jq.hasCl***REMOVED***("cl***REMOVED***4"), "Check hasCl***REMOVED*** with carriage return" );
	ok( jq.is(".cl***REMOVED***4"), "Check is with carriage return" );

	jq.removeCl***REMOVED***("cl***REMOVED***2");
	ok( jq.hasCl***REMOVED***("cl***REMOVED***2")===false, "Check the cl***REMOVED*** has been properly removed" );
	jq.removeCl***REMOVED***("cla");
	ok( jq.hasCl***REMOVED***("cla.ss3"), "Check the dotted cl***REMOVED*** has not been removed" );
	jq.removeCl***REMOVED***("cla.ss3");
	ok( jq.hasCl***REMOVED***("cla.ss3")===false, "Check the dotted cl***REMOVED*** has been removed" );
	jq.removeCl***REMOVED***("cl***REMOVED***4");
	ok( jq.hasCl***REMOVED***("cl***REMOVED***4")===false, "Check the cl***REMOVED*** has been properly removed" );
});

test("contents().hasCl***REMOVED***() returns correct values", function() {
	expect(2);

	var $div = jQuery("<div><span cl***REMOVED***='foo'></span><!-- comment -->text</div>"),
	$contents = $div.contents();

	ok( $contents.hasCl***REMOVED***("foo"), "Found 'foo' in $contents" );
	ok( !$contents.hasCl***REMOVED***("undefined"), "Did not find 'undefined' in $contents (correctly)" );
});

test("coords returns correct values in IE6/IE7, see #10828", function() {
	expect(2);

	var map = jQuery("<map />"),
		area;

	area = map.html("<area shape='rect' coords='0,0,0,0' href='#' alt='a' />").find("area");
	equal( area.attr("coords"), "0,0,0,0", "did not retrieve coords correctly");

	area = map.html("<area shape='rect' href='#' alt='a' /></map>").find("area");
	equal( area.attr("coords"), undefined, "did not retrieve coords correctly");
});
