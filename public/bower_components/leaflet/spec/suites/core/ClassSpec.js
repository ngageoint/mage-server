describe("Cl***REMOVED***", function () {

	describe("#extend", function () {
		var Kl***REMOVED***,
			constructor,
			method;

		beforeEach(function () {
			constructor = sinon.spy();
			method = sinon.spy();

			Kl***REMOVED*** = L.Cl***REMOVED***.extend({
				statics: {bla: 1},
				includes: {mixin: true},

				initialize: constructor,
				foo: 5,
				bar: method
			});
		});

		it("creates a cl***REMOVED*** with the given constructor & properties", function () {
			var a = new Kl***REMOVED***();

			expect(constructor.called).to.be.ok();
			expect(a.foo).to.eql(5);

			a.bar();

			expect(method.called).to.be.ok();
		});

		it("inherits parent cl***REMOVED***es' constructor & properties", function () {
			var Kl***REMOVED***2 = Kl***REMOVED***.extend({baz: 2});

			var b = new Kl***REMOVED***2();

			expect(b instanceof Kl***REMOVED***).to.be.ok();
			expect(b instanceof Kl***REMOVED***2).to.be.ok();

			expect(constructor.called).to.be.ok();
			expect(b.baz).to.eql(2);

			b.bar();

			expect(method.called).to.be.ok();
		});

		it("supports static properties", function () {
			expect(Kl***REMOVED***.bla).to.eql(1);
		});

		it("inherits parent static properties", function () {
			var Kl***REMOVED***2 = Kl***REMOVED***.extend({});

			expect(Kl***REMOVED***2.bla).to.eql(1);
		});

		it("overrides parent static properties", function () {
			var Kl***REMOVED***2 = Kl***REMOVED***.extend({statics: {bla: 2}});

			expect(Kl***REMOVED***2.bla).to.eql(2);
		});

		it("includes the given mixin", function () {
			var a = new Kl***REMOVED***();
			expect(a.mixin).to.be.ok();
		});

		it("includes multiple mixins", function () {
			var Kl***REMOVED***2 = L.Cl***REMOVED***.extend({
				includes: [{mixin: true}, {mixin2: true}]
			});
			var a = new Kl***REMOVED***2();

			expect(a.mixin).to.be.ok();
			expect(a.mixin2).to.be.ok();
		});

		it("grants the ability to include the given mixin", function () {
			Kl***REMOVED***.include({mixin2: true});

			var a = new Kl***REMOVED***();
			expect(a.mixin2).to.be.ok();
		});

		it("merges options instead of replacing them", function () {
			var Kl***REMOVED***WithOptions1 = L.Cl***REMOVED***.extend({
				options: {
					foo1: 1,
					foo2: 2
				}
			});
			var Kl***REMOVED***WithOptions2 = Kl***REMOVED***WithOptions1.extend({
				options: {
					foo2: 3,
					foo3: 4
				}
			});

			var a = new Kl***REMOVED***WithOptions2();

			expect(a.options).to.eql({
				foo1: 1,
				foo2: 3,
				foo3: 4
			});
		});

		it("adds constructor hooks correctly", function () {
			var spy1 = sinon.spy();

			Kl***REMOVED***.addInitHook(spy1);
			Kl***REMOVED***.addInitHook('bar', 1, 2, 3);

			var a = new Kl***REMOVED***();

			expect(spy1.called).to.be.ok();
			expect(method.calledWith(1, 2, 3));
		});

		it("inherits constructor hooks", function () {
			var spy1 = sinon.spy(),
				spy2 = sinon.spy();

			var Kl***REMOVED***2 = Kl***REMOVED***.extend({});

			Kl***REMOVED***.addInitHook(spy1);
			Kl***REMOVED***2.addInitHook(spy2);

			var a = new Kl***REMOVED***2();

			expect(spy1.called).to.be.ok();
			expect(spy2.called).to.be.ok();
		});

		it("does not call child constructor hooks", function () {
			var spy1 = sinon.spy(),
				spy2 = sinon.spy();

			var Kl***REMOVED***2 = Kl***REMOVED***.extend({});

			Kl***REMOVED***.addInitHook(spy1);
			Kl***REMOVED***2.addInitHook(spy2);

			var a = new Kl***REMOVED***();

			expect(spy1.called).to.be.ok();
			expect(spy2.called).to.eql(false);
		});
	});

	// TODO Cl***REMOVED***.include

	// TODO Cl***REMOVED***.mergeOptions
});
