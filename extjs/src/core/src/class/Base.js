//@tag foundation,core
//@require ../lang/Date.js

/**
 * @author Jacky Nguyen <jacky@sencha.com>
 * @docauthor Jacky Nguyen <jacky@sencha.com>
 * @cl***REMOVED*** Ext.Base
 *
 * The root of all cl***REMOVED***es created with {@link Ext#define}.
 *
 * Ext.Base is the building block of all Ext cl***REMOVED***es. All cl***REMOVED***es in Ext inherit from Ext.Base.
 * All prototype and static members of this cl***REMOVED*** are inherited by all other cl***REMOVED***es.
 */
(function(flexSetter) {

var noArgs = [],
    Base = function(){};

    // These static properties will be copied to every newly created cl***REMOVED*** with {@link Ext#define}
    Ext.apply(Base, {
        $cl***REMOVED***Name: 'Ext.Base',

        $isCl***REMOVED***: true,

        /**
         * Create a new instance of this Cl***REMOVED***.
         *
         *     Ext.define('My.cool.Cl***REMOVED***', {
         *         ...
         *     });
         *
         *     My.cool.Cl***REMOVED***.create({
         *         someConfig: true
         *     });
         *
         * All parameters are p***REMOVED***ed to the constructor of the cl***REMOVED***.
         *
         * @return {Object} the created instance.
         * @static
         * @inheritable
         */
        create: function() {
            return Ext.create.apply(Ext, [this].concat(Array.prototype.slice.call(arguments, 0)));
        },

        /**
         * @private
         * @static
         * @inheritable
         * @param config
         */
        extend: function(parent) {
            var parentPrototype = parent.prototype,
                basePrototype, prototype, i, ln, name, statics;

            prototype = this.prototype = Ext.Object.chain(parentPrototype);
            prototype.self = this;

            this.supercl***REMOVED*** = prototype.supercl***REMOVED*** = parentPrototype;

            if (!parent.$isCl***REMOVED***) {
                basePrototype = Ext.Base.prototype;

                for (i in basePrototype) {
                    if (i in prototype) {
                        prototype[i] = basePrototype[i];
                    }
                }
            }

            //<feature cl***REMOVED***System.inheritableStatics>
            // Statics inheritance
            statics = parentPrototype.$inheritableStatics;

            if (statics) {
                for (i = 0,ln = statics.length; i < ln; i++) {
                    name = statics[i];

                    if (!this.hasOwnProperty(name)) {
                        this[name] = parent[name];
                    }
                }
            }
            //</feature>

            if (parent.$onExtended) {
                this.$onExtended = parent.$onExtended.slice();
            }

            //<feature cl***REMOVED***System.config>
            prototype.config = new prototype.configCl***REMOVED***();
            prototype.initConfigList = prototype.initConfigList.slice();
            prototype.initConfigMap = Ext.clone(prototype.initConfigMap);
            prototype.configMap = Ext.Object.chain(prototype.configMap);
            //</feature>
        },

        /**
         * @private
         * @static
         * @inheritable
         */
        $onExtended: [],

        /**
         * @private
         * @static
         * @inheritable
         */
        triggerExtended: function() {
            var callbacks = this.$onExtended,
                ln = callbacks.length,
                i, callback;

            if (ln > 0) {
                for (i = 0; i < ln; i++) {
                    callback = callbacks[i];
                    callback.fn.apply(callback.scope || this, arguments);
                }
            }
        },

        /**
         * @private
         * @static
         * @inheritable
         */
        onExtended: function(fn, scope) {
            this.$onExtended.push({
                fn: fn,
                scope: scope
            });

            return this;
        },

        /**
         * @private
         * @static
         * @inheritable
         * @param config
         */
        addConfig: function(config, fullMerge) {
            var prototype = this.prototype,
                configNameCache = Ext.Cl***REMOVED***.configNameCache,
                hasConfig = prototype.configMap,
                initConfigList = prototype.initConfigList,
                initConfigMap = prototype.initConfigMap,
                defaultConfig = prototype.config,
                initializedName, name, value;

            for (name in config) {
                if (config.hasOwnProperty(name)) {
                    if (!hasConfig[name]) {
                        hasConfig[name] = true;
                    }

                    value = config[name];

                    initializedName = configNameCache[name].initialized;

                    if (!initConfigMap[name] && value !== null && !prototype[initializedName]) {
                        initConfigMap[name] = true;
                        initConfigList.push(name);
                    }
                }
            }

            if (fullMerge) {
                Ext.merge(defaultConfig, config);
            }
            else {
                Ext.mergeIf(defaultConfig, config);
            }

            prototype.configCl***REMOVED*** = Ext.Object.cl***REMOVED***ify(defaultConfig);
        },

        /**
         * Add / override static properties of this cl***REMOVED***.
         *
         *     Ext.define('My.cool.Cl***REMOVED***', {
         *         ...
         *     });
         *
         *     My.cool.Cl***REMOVED***.addStatics({
         *         someProperty: 'someValue',      // My.cool.Cl***REMOVED***.someProperty = 'someValue'
         *         method1: function() { ... },    // My.cool.Cl***REMOVED***.method1 = function() { ... };
         *         method2: function() { ... }     // My.cool.Cl***REMOVED***.method2 = function() { ... };
         *     });
         *
         * @param {Object} members
         * @return {Ext.Base} this
         * @static
         * @inheritable
         */
        addStatics: function(members) {
            var member, name;

            for (name in members) {
                if (members.hasOwnProperty(name)) {
                    member = members[name];
                    if (typeof member == 'function' && !member.$isCl***REMOVED*** && member !== Ext.emptyFn && member !== Ext.identityFn) {
                        member.$owner = this;
                        member.$name = name;
                        //<debug>
                        member.displayName = Ext.getCl***REMOVED***Name(this) + '.' + name;
                        //</debug>
                    }
                    this[name] = member;
                }
            }

            return this;
        },

        /**
         * @private
         * @static
         * @inheritable
         * @param {Object} members
         */
        addInheritableStatics: function(members) {
            var inheritableStatics,
                hasInheritableStatics,
                prototype = this.prototype,
                name, member;

            inheritableStatics = prototype.$inheritableStatics;
            hasInheritableStatics = prototype.$hasInheritableStatics;

            if (!inheritableStatics) {
                inheritableStatics = prototype.$inheritableStatics = [];
                hasInheritableStatics = prototype.$hasInheritableStatics = {};
            }

            for (name in members) {
                if (members.hasOwnProperty(name)) {
                    member = members[name];
                    //<debug>
                    if (typeof member == 'function') {
                        member.displayName = Ext.getCl***REMOVED***Name(this) + '.' + name;
                    }
                    //</debug>
                    this[name] = member;

                    if (!hasInheritableStatics[name]) {
                        hasInheritableStatics[name] = true;
                        inheritableStatics.push(name);
                    }
                }
            }

            return this;
        },

        /**
         * Add methods / properties to the prototype of this cl***REMOVED***.
         *
         *     Ext.define('My.awesome.Cat', {
         *         constructor: function() {
         *             ...
         *         }
         *     });
         *
         *      My.awesome.Cat.addMembers({
         *          meow: function() {
         *             alert('Meowww...');
         *          }
         *      });
         *
         *      var kitty = new My.awesome.Cat;
         *      kitty.meow();
         *
         * @param {Object} members
         * @static
         * @inheritable
         */
        addMembers: function(members) {
            var prototype = this.prototype,
                enumerables = Ext.enumerables,
                names = [],
                i, ln, name, member;

            for (name in members) {
                names.push(name);
            }

            if (enumerables) {
                names.push.apply(names, enumerables);
            }

            for (i = 0,ln = names.length; i < ln; i++) {
                name = names[i];

                if (members.hasOwnProperty(name)) {
                    member = members[name];

                    if (typeof member == 'function' && !member.$isCl***REMOVED*** && member !== Ext.emptyFn) {
                        member.$owner = this;
                        member.$name = name;
                        //<debug>
                        member.displayName = (this.$cl***REMOVED***Name || '') + '#' + name;
                        //</debug>
                    }

                    prototype[name] = member;
                }
            }

            return this;
        },

        /**
         * @private
         * @static
         * @inheritable
         * @param name
         * @param member
         */
        addMember: function(name, member) {
            if (typeof member == 'function' && !member.$isCl***REMOVED*** && member !== Ext.emptyFn) {
                member.$owner = this;
                member.$name = name;
                //<debug>
                member.displayName = (this.$cl***REMOVED***Name || '') + '#' + name;
                //</debug>
            }

            this.prototype[name] = member;

            return this;
        },

        /**
         * Adds members to cl***REMOVED***.
         * @static
         * @inheritable
         * @deprecated 4.1 Use {@link #addMembers} instead.
         */
        implement: function() {
            this.addMembers.apply(this, arguments);
        },

        /**
         * Borrow another cl***REMOVED***' members to the prototype of this cl***REMOVED***.
         *
         *     Ext.define('Bank', {
         *         money: '$$$',
         *         printMoney: function() {
         *             alert('$$$$$$$');
         *         }
         *     });
         *
         *     Ext.define('Thief', {
         *         ...
         *     });
         *
         *     Thief.borrow(Bank, ['money', 'printMoney']);
         *
         *     var steve = new Thief();
         *
         *     alert(steve.money); // alerts '$$$'
         *     steve.printMoney(); // alerts '$$$$$$$'
         *
         * @param {Ext.Base} fromCl***REMOVED*** The cl***REMOVED*** to borrow members from
         * @param {Array/String} members The names of the members to borrow
         * @return {Ext.Base} this
         * @static
         * @inheritable
         * @private
         */
        borrow: function(fromCl***REMOVED***, members) {
            var prototype = this.prototype,
                fromPrototype = fromCl***REMOVED***.prototype,
                //<debug>
                cl***REMOVED***Name = Ext.getCl***REMOVED***Name(this),
                //</debug>
                i, ln, name, fn, toBorrow;

            members = Ext.Array.from(members);

            for (i = 0,ln = members.length; i < ln; i++) {
                name = members[i];

                toBorrow = fromPrototype[name];

                if (typeof toBorrow == 'function') {
                    fn = Ext.Function.clone(toBorrow);

                    //<debug>
                    if (cl***REMOVED***Name) {
                        fn.displayName = cl***REMOVED***Name + '#' + name;
                    }
                    //</debug>

                    fn.$owner = this;
                    fn.$name = name;

                    prototype[name] = fn;
                }
                else {
                    prototype[name] = toBorrow;
                }
            }

            return this;
        },

        /**
         * Override members of this cl***REMOVED***. Overridden methods can be invoked via
         * {@link Ext.Base#callParent}.
         *
         *     Ext.define('My.Cat', {
         *         constructor: function() {
         *             alert("I'm a cat!");
         *         }
         *     });
         *
         *     My.Cat.override({
         *         constructor: function() {
         *             alert("I'm going to be a cat!");
         *
         *             this.callParent(arguments);
         *
         *             alert("Meeeeoooowwww");
         *         }
         *     });
         *
         *     var kitty = new My.Cat(); // alerts "I'm going to be a cat!"
         *                               // alerts "I'm a cat!"
         *                               // alerts "Meeeeoooowwww"
         *
         * As of 4.1, direct use of this method is deprecated. Use {@link Ext#define Ext.define}
         * instead:
         *
         *     Ext.define('My.CatOverride', {
         *         override: 'My.Cat',
         *         constructor: function() {
         *             alert("I'm going to be a cat!");
         *
         *             this.callParent(arguments);
         *
         *             alert("Meeeeoooowwww");
         *         }
         *     });
         *
         * The above accomplishes the same result but can be managed by the {@link Ext.Loader}
         * which can properly order the override and its target cl***REMOVED*** and the build process
         * can determine whether the override is needed based on the required state of the
         * target cl***REMOVED*** (My.Cat).
         *
         * @param {Object} members The properties to add to this cl***REMOVED***. This should be
         * specified as an object literal containing one or more properties.
         * @return {Ext.Base} this cl***REMOVED***
         * @static
         * @inheritable
         * @markdown
         * @deprecated 4.1.0 Use {@link Ext#define Ext.define} instead
         */
        override: function(members) {
            var me = this,
                enumerables = Ext.enumerables,
                target = me.prototype,
                cloneFunction = Ext.Function.clone,
                name, index, member, statics, names, previous;

            if (arguments.length === 2) {
                name = members;
                members = {};
                members[name] = arguments[1];
                enumerables = null;
            }

            do {
                names = []; // clean slate for prototype (1st p***REMOVED***) and static (2nd p***REMOVED***)
                statics = null; // not needed 1st p***REMOVED***, but needs to be cleared for 2nd p***REMOVED***

                for (name in members) { // hasOwnProperty is checked in the next loop...
                    if (name == 'statics') {
                        statics = members[name];
                    } else if (name == 'config') {
                        me.addConfig(members[name], true);
                    } else {
                        names.push(name);
                    }
                }

                if (enumerables) {
                    names.push.apply(names, enumerables);
                }

                for (index = names.length; index--; ) {
                    name = names[index];

                    if (members.hasOwnProperty(name)) {
                        member = members[name];

                        if (typeof member == 'function' && !member.$cl***REMOVED***Name && member !== Ext.emptyFn) {
                            if (typeof member.$owner != 'undefined') {
                                member = cloneFunction(member);
                            }

                            //<debug>
                            if (me.$cl***REMOVED***Name) {
                                member.displayName = me.$cl***REMOVED***Name + '#' + name;
                            }
                            //</debug>

                            member.$owner = me;
                            member.$name = name;

                            previous = target[name];
                            if (previous) {
                                member.$previous = previous;
                            }
                        }

                        target[name] = member;
                    }
                }

                target = me; // 2nd p***REMOVED*** is for statics
                members = statics; // statics will be null on 2nd p***REMOVED***
            } while (members);

            return this;
        },

        // Documented downwards
        callParent: function(args) {
            var method;

            // This code is intentionally inlined for the least number of debugger stepping
            return (method = this.callParent.caller) && (method.$previous ||
                ((method = method.$owner ? method : method.caller) &&
                    method.$owner.supercl***REMOVED***.self[method.$name])).apply(this, args || noArgs);
        },

        // Documented downwards
        callSuper: function(args) {
            var method;

            // This code is intentionally inlined for the least number of debugger stepping
            return (method = this.callSuper.caller) &&
                ((method = method.$owner ? method : method.caller) &&
                    method.$owner.supercl***REMOVED***.self[method.$name]).apply(this, args || noArgs);
        },

        //<feature cl***REMOVED***System.mixins>
        /**
         * Used internally by the mixins pre-processor
         * @private
         * @static
         * @inheritable
         */
        mixin: function(name, mixinCl***REMOVED***) {
            var mixin = mixinCl***REMOVED***.prototype,
                prototype = this.prototype,
                key;

            if (typeof mixin.onCl***REMOVED***MixedIn != 'undefined') {
                mixin.onCl***REMOVED***MixedIn.call(mixinCl***REMOVED***, this);
            }

            if (!prototype.hasOwnProperty('mixins')) {
                if ('mixins' in prototype) {
                    prototype.mixins = Ext.Object.chain(prototype.mixins);
                }
                else {
                    prototype.mixins = {};
                }
            }

            for (key in mixin) {
                if (key === 'mixins') {
                    Ext.merge(prototype.mixins, mixin[key]);
                }
                else if (typeof prototype[key] == 'undefined' && key != 'mixinId' && key != 'config') {
                    prototype[key] = mixin[key];
                }
            }

            //<feature cl***REMOVED***System.config>
            if ('config' in mixin) {
                this.addConfig(mixin.config, false);
            }
            //</feature>

            prototype.mixins[name] = mixin;
        },
        //</feature>

        /**
         * Get the current cl***REMOVED***' name in string format.
         *
         *     Ext.define('My.cool.Cl***REMOVED***', {
         *         constructor: function() {
         *             alert(this.self.getName()); // alerts 'My.cool.Cl***REMOVED***'
         *         }
         *     });
         *
         *     My.cool.Cl***REMOVED***.getName(); // 'My.cool.Cl***REMOVED***'
         *
         * @return {String} cl***REMOVED***Name
         * @static
         * @inheritable
         */
        getName: function() {
            return Ext.getCl***REMOVED***Name(this);
        },

        /**
         * Create aliases for existing prototype methods. Example:
         *
         *     Ext.define('My.cool.Cl***REMOVED***', {
         *         method1: function() { ... },
         *         method2: function() { ... }
         *     });
         *
         *     var test = new My.cool.Cl***REMOVED***();
         *
         *     My.cool.Cl***REMOVED***.createAlias({
         *         method3: 'method1',
         *         method4: 'method2'
         *     });
         *
         *     test.method3(); // test.method1()
         *
         *     My.cool.Cl***REMOVED***.createAlias('method5', 'method3');
         *
         *     test.method5(); // test.method3() -> test.method1()
         *
         * @param {String/Object} alias The new method name, or an object to set multiple aliases. See
         * {@link Ext.Function#flexSetter flexSetter}
         * @param {String/Object} origin The original method name
         * @static
         * @inheritable
         * @method
         */
        createAlias: flexSetter(function(alias, origin) {
            this.override(alias, function() {
                return this[origin].apply(this, arguments);
            });
        }),

        /**
         * @private
         * @static
         * @inheritable
         */
        addXtype: function(xtype) {
            var prototype = this.prototype,
                xtypesMap = prototype.xtypesMap,
                xtypes = prototype.xtypes,
                xtypesChain = prototype.xtypesChain;

            if (!prototype.hasOwnProperty('xtypesMap')) {
                xtypesMap = prototype.xtypesMap = Ext.merge({}, prototype.xtypesMap || {});
                xtypes = prototype.xtypes = prototype.xtypes ? [].concat(prototype.xtypes) : [];
                xtypesChain = prototype.xtypesChain = prototype.xtypesChain ? [].concat(prototype.xtypesChain) : [];
                prototype.xtype = xtype;
            }

            if (!xtypesMap[xtype]) {
                xtypesMap[xtype] = true;
                xtypes.push(xtype);
                xtypesChain.push(xtype);
                Ext.Cl***REMOVED***Manager.setAlias(this, 'widget.' + xtype);
            }

            return this;
        }
    });

    Base.implement({
        /** @private */
        isInstance: true,

        /** @private */
        $cl***REMOVED***Name: 'Ext.Base',

        /** @private */
        configCl***REMOVED***: Ext.emptyFn,

        /** @private */
        initConfigList: [],

        /** @private */
        configMap: {},

        /** @private */
        initConfigMap: {},

        /**
         * Get the reference to the cl***REMOVED*** from which this object was instantiated. Note that unlike {@link Ext.Base#self},
         * `this.statics()` is scope-independent and it always returns the cl***REMOVED*** from which it was called, regardless of what
         * `this` points to during run-time
         *
         *     Ext.define('My.Cat', {
         *         statics: {
         *             totalCreated: 0,
         *             speciesName: 'Cat' // My.Cat.speciesName = 'Cat'
         *         },
         *
         *         constructor: function() {
         *             var statics = this.statics();
         *
         *             alert(statics.speciesName);     // always equals to 'Cat' no matter what 'this' refers to
         *                                             // equivalent to: My.Cat.speciesName
         *
         *             alert(this.self.speciesName);   // dependent on 'this'
         *
         *             statics.totalCreated++;
         *         },
         *
         *         clone: function() {
         *             var cloned = new this.self;                      // dependent on 'this'
         *
         *             cloned.groupName = this.statics().speciesName;   // equivalent to: My.Cat.speciesName
         *
         *             return cloned;
         *         }
         *     });
         *
         *
         *     Ext.define('My.SnowLeopard', {
         *         extend: 'My.Cat',
         *
         *         statics: {
         *             speciesName: 'Snow Leopard'     // My.SnowLeopard.speciesName = 'Snow Leopard'
         *         },
         *
         *         constructor: function() {
         *             this.callParent();
         *         }
         *     });
         *
         *     var cat = new My.Cat();                 // alerts 'Cat', then alerts 'Cat'
         *
         *     var snowLeopard = new My.SnowLeopard(); // alerts 'Cat', then alerts 'Snow Leopard'
         *
         *     var clone = snowLeopard.clone();
         *     alert(Ext.getCl***REMOVED***Name(clone));         // alerts 'My.SnowLeopard'
         *     alert(clone.groupName);                 // alerts 'Cat'
         *
         *     alert(My.Cat.totalCreated);             // alerts 3
         *
         * @protected
         * @return {Ext.Cl***REMOVED***}
         */
        statics: function() {
            var method = this.statics.caller,
                self = this.self;

            if (!method) {
                return self;
            }

            return method.$owner;
        },

        /**
         * Call the "parent" method of the current method. That is the method previously
         * overridden by derivation or by an override (see {@link Ext#define}).
         *
         *      Ext.define('My.Base', {
         *          constructor: function (x) {
         *              this.x = x;
         *          },
         *
         *          statics: {
         *              method: function (x) {
         *                  return x;
         *              }
         *          }
         *      });
         *
         *      Ext.define('My.Derived', {
         *          extend: 'My.Base',
         *
         *          constructor: function () {
         *              this.callParent([21]);
         *          }
         *      });
         *
         *      var obj = new My.Derived();
         *
         *      alert(obj.x);  // alerts 21
         *
         * This can be used with an override as follows:
         *
         *      Ext.define('My.DerivedOverride', {
         *          override: 'My.Derived',
         *
         *          constructor: function (x) {
         *              this.callParent([x*2]); // calls original My.Derived constructor
         *          }
         *      });
         *
         *      var obj = new My.Derived();
         *
         *      alert(obj.x);  // now alerts 42
         *
         * This also works with static methods.
         *
         *      Ext.define('My.Derived2', {
         *          extend: 'My.Base',
         *
         *          statics: {
         *              method: function (x) {
         *                  return this.callParent([x*2]); // calls My.Base.method
         *              }
         *          }
         *      });
         *
         *      alert(My.Base.method(10);     // alerts 10
         *      alert(My.Derived2.method(10); // alerts 20
         *
         * Lastly, it also works with overridden static methods.
         *
         *      Ext.define('My.Derived2Override', {
         *          override: 'My.Derived2',
         *
         *          statics: {
         *              method: function (x) {
         *                  return this.callParent([x*2]); // calls My.Derived2.method
         *              }
         *          }
         *      });
         *
         *      alert(My.Derived2.method(10); // now alerts 40
         *
         * To override a method and replace it and also call the supercl***REMOVED*** method, use
         * {@link #callSuper}. This is often done to patch a method to fix a bug.
         *
         * @protected
         * @param {Array/Arguments} args The arguments, either an array or the `arguments` object
         * from the current method, for example: `this.callParent(arguments)`
         * @return {Object} Returns the result of calling the parent method
         */
        callParent: function(args) {
            // NOTE: this code is deliberately as few expressions (and no function calls)
            // as possible so that a debugger can skip over this noise with the minimum number
            // of steps. Basically, just hit Step Into until you are where you really wanted
            // to be.
            var method,
                superMethod = (method = this.callParent.caller) && (method.$previous ||
                        ((method = method.$owner ? method : method.caller) &&
                                method.$owner.supercl***REMOVED***[method.$name]));

            //<debug error>
            if (!superMethod) {
                method = this.callParent.caller;
                var parentCl***REMOVED***, methodName;

                if (!method.$owner) {
                    if (!method.caller) {
                        throw new Error("Attempting to call a protected method from the public scope, which is not allowed");
                    }

                    method = method.caller;
                }

                parentCl***REMOVED*** = method.$owner.supercl***REMOVED***;
                methodName = method.$name;

                if (!(methodName in parentCl***REMOVED***)) {
                    throw new Error("this.callParent() was called but there's no such method (" + methodName +
                                ") found in the parent cl***REMOVED*** (" + (Ext.getCl***REMOVED***Name(parentCl***REMOVED***) || 'Object') + ")");
                }
            }
            //</debug>

            return superMethod.apply(this, args || noArgs);
        },

        /**
         * This method is used by an override to call the supercl***REMOVED*** method but byp***REMOVED*** any
         * overridden method. This is often done to "patch" a method that contains a bug
         * but for whatever reason cannot be fixed directly.
         *
         * Consider:
         *
         *      Ext.define('Ext.some.Cl***REMOVED***', {
         *          method: function () {
         *              console.log('Good');
         *          }
         *      });
         *
         *      Ext.define('Ext.some.DerivedCl***REMOVED***', {
         *          method: function () {
         *              console.log('Bad');
         *
         *              // ... logic but with a bug ...
         *
         *              this.callParent();
         *          }
         *      });
         *
         * To patch the bug in `DerivedCl***REMOVED***.method`, the typical solution is to create an
         * override:
         *
         *      Ext.define('App.paches.DerivedCl***REMOVED***', {
         *          override: 'Ext.some.DerivedCl***REMOVED***',
         *
         *          method: function () {
         *              console.log('Fixed');
         *
         *              // ... logic but with bug fixed ...
         *
         *              this.callSuper();
         *          }
         *      });
         *
         * The patch method cannot use `callParent` to call the supercl***REMOVED*** `method` since
         * that would call the overridden method containing the bug. In other words, the
         * above patch would only produce "Fixed" then "Good" in the console log, whereas,
         * using `callParent` would produce "Fixed" then "Bad" then "Good".
         *
         * @protected
         * @param {Array/Arguments} args The arguments, either an array or the `arguments` object
         * from the current method, for example: `this.callSuper(arguments)`
         * @return {Object} Returns the result of calling the supercl***REMOVED*** method
         */
        callSuper: function(args) {
            // NOTE: this code is deliberately as few expressions (and no function calls)
            // as possible so that a debugger can skip over this noise with the minimum number
            // of steps. Basically, just hit Step Into until you are where you really wanted
            // to be.
            var method,
                superMethod = (method = this.callSuper.caller) &&
                    ((method = method.$owner ? method : method.caller) &&
                        method.$owner.supercl***REMOVED***[method.$name]);

            //<debug error>
            if (!superMethod) {
                method = this.callSuper.caller;
                var parentCl***REMOVED***, methodName;

                if (!method.$owner) {
                    if (!method.caller) {
                        throw new Error("Attempting to call a protected method from the public scope, which is not allowed");
                    }

                    method = method.caller;
                }

                parentCl***REMOVED*** = method.$owner.supercl***REMOVED***;
                methodName = method.$name;

                if (!(methodName in parentCl***REMOVED***)) {
                    throw new Error("this.callSuper() was called but there's no such method (" + methodName +
                        ") found in the parent cl***REMOVED*** (" + (Ext.getCl***REMOVED***Name(parentCl***REMOVED***) || 'Object') + ")");
                }
            }
            //</debug>

            return superMethod.apply(this, args || noArgs);
        },

        /**
         * @property {Ext.Cl***REMOVED***} self
         *
         * Get the reference to the current cl***REMOVED*** from which this object was instantiated. Unlike {@link Ext.Base#statics},
         * `this.self` is scope-dependent and it's meant to be used for dynamic inheritance. See {@link Ext.Base#statics}
         * for a detailed comparison
         *
         *     Ext.define('My.Cat', {
         *         statics: {
         *             speciesName: 'Cat' // My.Cat.speciesName = 'Cat'
         *         },
         *
         *         constructor: function() {
         *             alert(this.self.speciesName); // dependent on 'this'
         *         },
         *
         *         clone: function() {
         *             return new this.self();
         *         }
         *     });
         *
         *
         *     Ext.define('My.SnowLeopard', {
         *         extend: 'My.Cat',
         *         statics: {
         *             speciesName: 'Snow Leopard'         // My.SnowLeopard.speciesName = 'Snow Leopard'
         *         }
         *     });
         *
         *     var cat = new My.Cat();                     // alerts 'Cat'
         *     var snowLeopard = new My.SnowLeopard();     // alerts 'Snow Leopard'
         *
         *     var clone = snowLeopard.clone();
         *     alert(Ext.getCl***REMOVED***Name(clone));             // alerts 'My.SnowLeopard'
         *
         * @protected
         */
        self: Base,

        // Default constructor, simply returns `this`
        constructor: function() {
            return this;
        },

        //<feature cl***REMOVED***System.config>
        /**
         * Initialize configuration for this cl***REMOVED***. a typical example:
         *
         *     Ext.define('My.awesome.Cl***REMOVED***', {
         *         // The default config
         *         config: {
         *             name: 'Awesome',
         *             isAwesome: true
         *         },
         *
         *         constructor: function(config) {
         *             this.initConfig(config);
         *         }
         *     });
         *
         *     var awesome = new My.awesome.Cl***REMOVED***({
         *         name: 'Super Awesome'
         *     });
         *
         *     alert(awesome.getName()); // 'Super Awesome'
         *
         * @protected
         * @param {Object} config
         * @return {Ext.Base} this
         */
        initConfig: function(config) {
            var instanceConfig = config,
                configNameCache = Ext.Cl***REMOVED***.configNameCache,
                defaultConfig = new this.configCl***REMOVED***(),
                defaultConfigList = this.initConfigList,
                hasConfig = this.configMap,
                nameMap, i, ln, name, initializedName;

            this.initConfig = Ext.emptyFn;

            this.initialConfig = instanceConfig || {};

            this.config = config = (instanceConfig) ? Ext.merge(defaultConfig, config) : defaultConfig;

            if (instanceConfig) {
                defaultConfigList = defaultConfigList.slice();

                for (name in instanceConfig) {
                    if (hasConfig[name]) {
                        if (instanceConfig[name] !== null) {
                            defaultConfigList.push(name);
                            this[configNameCache[name].initialized] = false;
                        }
                    }
                }
            }

            for (i = 0,ln = defaultConfigList.length; i < ln; i++) {
                name = defaultConfigList[i];
                nameMap = configNameCache[name];
                initializedName = nameMap.initialized;

                if (!this[initializedName]) {
                    this[initializedName] = true;
                    this[nameMap.set].call(this, config[name]);
                }
            }

            return this;
        },

        /**
         * @private
         * @param config
         */
        hasConfig: function(name) {
            return Boolean(this.configMap[name]);
        },

        /**
         * @private
         */
        setConfig: function(config, applyIfNotSet) {
            if (!config) {
                return this;
            }

            var configNameCache = Ext.Cl***REMOVED***.configNameCache,
                currentConfig = this.config,
                hasConfig = this.configMap,
                initialConfig = this.initialConfig,
                name, value;

            applyIfNotSet = Boolean(applyIfNotSet);

            for (name in config) {
                if (applyIfNotSet && initialConfig.hasOwnProperty(name)) {
                    continue;
                }

                value = config[name];
                currentConfig[name] = value;

                if (hasConfig[name]) {
                    this[configNameCache[name].set](value);
                }
            }

            return this;
        },

        /**
         * @private
         * @param name
         */
        getConfig: function(name) {
            var configNameCache = Ext.Cl***REMOVED***.configNameCache;

            return this[configNameCache[name].get]();
        },

        /**
         * Returns the initial configuration p***REMOVED***ed to constructor when instantiating
         * this cl***REMOVED***.
         * @param {String} [name] Name of the config option to return.
         * @return {Object/Mixed} The full config object or a single config value
         * when `name` parameter specified.
         */
        getInitialConfig: function(name) {
            var config = this.config;

            if (!name) {
                return config;
            }
            else {
                return config[name];
            }
        },

        /**
         * @private
         * @param names
         * @param callback
         * @param scope
         */
        onConfigUpdate: function(names, callback, scope) {
            var self = this.self,
                //<debug>
                cl***REMOVED***Name = self.$cl***REMOVED***Name,
                //</debug>
                i, ln, name,
                updaterName, updater, newUpdater;

            names = Ext.Array.from(names);

            scope = scope || this;

            for (i = 0,ln = names.length; i < ln; i++) {
                name = names[i];
                updaterName = 'update' + Ext.String.capitalize(name);
                updater = this[updaterName] || Ext.emptyFn;
                newUpdater = function() {
                    updater.apply(this, arguments);
                    scope[callback].apply(scope, arguments);
                };
                newUpdater.$name = updaterName;
                newUpdater.$owner = self;
                //<debug>
                newUpdater.displayName = cl***REMOVED***Name + '#' + updaterName;
                //</debug>

                this[updaterName] = newUpdater;
            }
        },
        //</feature>

        /**
         * @private
         */
        destroy: function() {
            this.destroy = Ext.emptyFn;
        }
    });

    /**
     * Call the original method that was previously overridden with {@link Ext.Base#override}
     *
     *     Ext.define('My.Cat', {
     *         constructor: function() {
     *             alert("I'm a cat!");
     *         }
     *     });
     *
     *     My.Cat.override({
     *         constructor: function() {
     *             alert("I'm going to be a cat!");
     *
     *             this.callOverridden();
     *
     *             alert("Meeeeoooowwww");
     *         }
     *     });
     *
     *     var kitty = new My.Cat(); // alerts "I'm going to be a cat!"
     *                               // alerts "I'm a cat!"
     *                               // alerts "Meeeeoooowwww"
     *
     * @param {Array/Arguments} args The arguments, either an array or the `arguments` object
     * from the current method, for example: `this.callOverridden(arguments)`
     * @return {Object} Returns the result of calling the overridden method
     * @protected
     * @deprecated as of 4.1. Use {@link #callParent} instead.
     */
    Base.prototype.callOverridden = Base.prototype.callParent;

    Ext.Base = Base;

}(Ext.Function.flexSetter));
