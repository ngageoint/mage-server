describe('DomUtil', function () {
	var el;

	beforeEach(function () {
		el = document.createElement('div');
		el.style.position = 'absolute';
		el.style.top = el.style.left = '-10000px';
		document.body.appendChild(el);
	});

	afterEach(function () {
		document.body.removeChild(el);
	});

	describe('#get', function () {
		it('gets element by id if the given argument is string', function () {
			el.id = 'testId';
			expect(L.DomUtil.get(el.id)).to.eql(el);
		});

		it('returns the element if it is given as an argument', function () {
			expect(L.DomUtil.get(el)).to.eql(el);
		});
	});

	describe('#addCl***REMOVED***, #removeCl***REMOVED***, #hasCl***REMOVED***', function () {
		it('has defined cl***REMOVED*** for test element', function () {
			el.cl***REMOVED***Name = 'bar foo baz ';
			expect(L.DomUtil.hasCl***REMOVED***(el, 'foo')).to.be.ok();
			expect(L.DomUtil.hasCl***REMOVED***(el, 'bar')).to.be.ok();
			expect(L.DomUtil.hasCl***REMOVED***(el, 'baz')).to.be.ok();
			expect(L.DomUtil.hasCl***REMOVED***(el, 'boo')).to.not.be.ok();
		});

		it('adds or removes the cl***REMOVED***', function () {
			el.cl***REMOVED***Name = '';
			L.DomUtil.addCl***REMOVED***(el, 'foo');

			expect(el.cl***REMOVED***Name).to.eql('foo');
			expect(L.DomUtil.hasCl***REMOVED***(el, 'foo')).to.be.ok();

			L.DomUtil.addCl***REMOVED***(el, 'bar');
			expect(el.cl***REMOVED***Name).to.eql('foo bar');
			expect(L.DomUtil.hasCl***REMOVED***(el, 'foo')).to.be.ok();

			L.DomUtil.removeCl***REMOVED***(el, 'foo');
			expect(el.cl***REMOVED***Name).to.eql('bar');
			expect(L.DomUtil.hasCl***REMOVED***(el, 'foo')).to.not.be.ok();

			el.cl***REMOVED***Name = 'foo bar barz';
			L.DomUtil.removeCl***REMOVED***(el, 'bar');
			expect(el.cl***REMOVED***Name).to.eql('foo barz');
		});
	});

	describe('#getViewportOffset', function () {
		it('calculates the viewport offset of an element', function () {
			var div = document.createElement('div');
			div.style.position = 'absolute';
			div.style.top = '100px';
			div.style.left = '200px';
			div.style.border = '10px solid black';
			div.style.padding = '50px';
			div.style.visibility = 'hidden';

			var div2 = document.createElement('div');
			div.style.marginTop = '100px';

			div.appendChild(div2);

			document.body.appendChild(div);

			expect(L.DomUtil.getViewportOffset(div2)).to.eql(new L.Point(260, 260));

			document.body.removeChild(div);
		});
	});

	// describe('#setPosition', noSpecs);

	// describe('#getStyle', noSpecs);
});
