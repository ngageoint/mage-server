//@tag foundation,core
//@require Base.js

/**
 * @author Jacky Nguyen <jacky@sencha.com>
 * @docauthor Jacky Nguyen <jacky@sencha.com>
 * @cl***REMOVED*** Ext.Cl***REMOVED***
 *
 * Handles cl***REMOVED*** creation throughout the framework. This is a low level factory that is used by Ext.Cl***REMOVED***Manager and generally
 * should not be used directly. If you choose to use Ext.Cl***REMOVED*** you will lose out on the namespace, aliasing and depency loading
 * features made available by Ext.Cl***REMOVED***Manager. The only time you would use Ext.Cl***REMOVED*** directly is to create an anonymous cl***REMOVED***.
 *
 * If you wish to create a cl***REMOVED*** you should use {@link Ext#define Ext.define} which aliases
 * {@link Ext.Cl***REMOVED***Manager#create Ext.Cl***REMOVED***Manager.create} to enable namespacing and dynamic dependency resolution.
 *
 * Ext.Cl***REMOVED*** is the factory and **not** the supercl***REMOVED*** of everything. For the base cl***REMOVED*** that **all** Ext cl***REMOVED***es inherit
 * from, see {@link Ext.Base}.
 */
(function() {
    var ExtCl***REMOVED***,
        Base = Ext.Base,
        baseStaticMembers = [],
        baseStaticMember, baseStaticMemberLength;

    for (baseStaticMember in Base) {
        if (Base.hasOwnProperty(baseStaticMember)) {
            baseStaticMembers.push(baseStaticMember);
        }
    }

    baseStaticMemberLength = baseStaticMembers.length;

    // Creates a constructor that has nothing extra in its scope chain.
    function makeCtor (cl***REMOVED***Name) {
        function constructor () {
            // Opera has some problems returning from a constructor when Dragonfly isn't running. The || null seems to
            // be sufficient to stop it misbehaving. Known to be required against 10.53, 11.51 and 11.61.
            return this.constructor.apply(this, arguments) || null;
        }
        //<debug>
        if (cl***REMOVED***Name) {
            constructor.displayName = cl***REMOVED***Name;
        }
        //</debug>
        return constructor;
    }

    /**
     * @method constructor
     * Create a new anonymous cl***REMOVED***.
     *
     * @param {Object} data An object represent the properties of this cl***REMOVED***
     * @param {Function} onCreated Optional, the callback function to be executed when this cl***REMOVED*** is fully created.
     * Note that the creation process can be asynchronous depending on the pre-processors used.
     *
     * @return {Ext.Base} The newly created cl***REMOVED***
     */
    Ext.Cl***REMOVED*** = ExtCl***REMOVED*** = function(Cl***REMOVED***, data, onCreated) {
        if (typeof Cl***REMOVED*** != 'function') {
            onCreated = data;
            data = Cl***REMOVED***;
            Cl***REMOVED*** = null;
        }

        if (!data) {
            data = {};
        }

        Cl***REMOVED*** = ExtCl***REMOVED***.create(Cl***REMOVED***, data);

        ExtCl***REMOVED***.process(Cl***REMOVED***, data, onCreated);

        return Cl***REMOVED***;
    };

    Ext.apply(ExtCl***REMOVED***, {
        /**
         * @private
         * @param Cl***REMOVED***
         * @param data
         * @param hooks
         */
        onBeforeCreated: function(Cl***REMOVED***, data, hooks) {
            Cl***REMOVED***.addMembers(data);

            hooks.onCreated.call(Cl***REMOVED***, Cl***REMOVED***);
        },

        /**
         * @private
         * @param Cl***REMOVED***
         * @param cl***REMOVED***Data
         * @param onCl***REMOVED***Created
         */
        create: function(Cl***REMOVED***, data) {
            var name, i;

            if (!Cl***REMOVED***) {
                Cl***REMOVED*** = makeCtor(
                    //<debug>
                    data.$cl***REMOVED***Name
                    //</debug>
                );
            }

            for (i = 0; i < baseStaticMemberLength; i++) {
                name = baseStaticMembers[i];
                Cl***REMOVED***[name] = Base[name];
            }

            return Cl***REMOVED***;
        },

        /**
         * @private
         * @param Cl***REMOVED***
         * @param data
         * @param onCreated
         */
        process: function(Cl***REMOVED***, data, onCreated) {
            var preprocessorStack = data.preprocessors || ExtCl***REMOVED***.defaultPreprocessors,
                registeredPreprocessors = this.preprocessors,
                hooks = {
                    onBeforeCreated: this.onBeforeCreated
                },
                preprocessors = [],
                preprocessor, preprocessorsProperties,
                i, ln, j, subLn, preprocessorProperty, process;

            delete data.preprocessors;

            for (i = 0,ln = preprocessorStack.length; i < ln; i++) {
                preprocessor = preprocessorStack[i];

                if (typeof preprocessor == 'string') {
                    preprocessor = registeredPreprocessors[preprocessor];
                    preprocessorsProperties = preprocessor.properties;

                    if (preprocessorsProperties === true) {
                        preprocessors.push(preprocessor.fn);
                    }
                    else if (preprocessorsProperties) {
                        for (j = 0,subLn = preprocessorsProperties.length; j < subLn; j++) {
                            preprocessorProperty = preprocessorsProperties[j];

                            if (data.hasOwnProperty(preprocessorProperty)) {
                                preprocessors.push(preprocessor.fn);
                                break;
                            }
                        }
                    }
                }
                else {
                    preprocessors.push(preprocessor);
                }
            }

            hooks.onCreated = onCreated ? onCreated : Ext.emptyFn;
            hooks.preprocessors = preprocessors;

            this.doProcess(Cl***REMOVED***, data, hooks);
        },
        
        doProcess: function(Cl***REMOVED***, data, hooks){
            var me = this,
                preprocessor = hooks.preprocessors.shift();

            if (!preprocessor) {
                hooks.onBeforeCreated.apply(me, arguments);
                return;
            }

            if (preprocessor.call(me, Cl***REMOVED***, data, hooks, me.doProcess) !== false) {
                me.doProcess(Cl***REMOVED***, data, hooks);
            }
        },

        /** @private */
        preprocessors: {},

        /**
         * Register a new pre-processor to be used during the cl***REMOVED*** creation process
         *
         * @param {String} name The pre-processor's name
         * @param {Function} fn The callback function to be executed. Typical format:
         *
         *     function(cls, data, fn) {
         *         // Your code here
         *
         *         // Execute this when the processing is finished.
         *         // Asynchronous processing is perfectly ok
         *         if (fn) {
         *             fn.call(this, cls, data);
         *         }
         *     });
         *
         * @param {Function} fn.cls The created cl***REMOVED***
         * @param {Object} fn.data The set of properties p***REMOVED***ed in {@link Ext.Cl***REMOVED***} constructor
         * @param {Function} fn.fn The callback function that **must** to be executed when this
         * pre-processor finishes, regardless of whether the processing is synchronous or aynchronous.
         * @return {Ext.Cl***REMOVED***} this
         * @private
         * @static
         */
        registerPreprocessor: function(name, fn, properties, position, relativeTo) {
            if (!position) {
                position = 'last';
            }

            if (!properties) {
                properties = [name];
            }

            this.preprocessors[name] = {
                name: name,
                properties: properties || false,
                fn: fn
            };

            this.setDefaultPreprocessorPosition(name, position, relativeTo);

            return this;
        },

        /**
         * Retrieve a pre-processor callback function by its name, which has been registered before
         *
         * @param {String} name
         * @return {Function} preprocessor
         * @private
         * @static
         */
        getPreprocessor: function(name) {
            return this.preprocessors[name];
        },

        /**
         * @private
         */
        getPreprocessors: function() {
            return this.preprocessors;
        },

        /**
         * @private
         */
        defaultPreprocessors: [],

        /**
         * Retrieve the array stack of default pre-processors
         * @return {Function[]} defaultPreprocessors
         * @private
         * @static
         */
        getDefaultPreprocessors: function() {
            return this.defaultPreprocessors;
        },

        /**
         * Set the default array stack of default pre-processors
         *
         * @private
         * @param {Array} preprocessors
         * @return {Ext.Cl***REMOVED***} this
         * @static
         */
        setDefaultPreprocessors: function(preprocessors) {
            this.defaultPreprocessors = Ext.Array.from(preprocessors);

            return this;
        },

        /**
         * Insert this pre-processor at a specific position in the stack, optionally relative to
         * any existing pre-processor. For example:
         *
         *     Ext.Cl***REMOVED***.registerPreprocessor('debug', function(cls, data, fn) {
         *         // Your code here
         *
         *         if (fn) {
         *             fn.call(this, cls, data);
         *         }
         *     }).setDefaultPreprocessorPosition('debug', 'last');
         *
         * @private
         * @param {String} name The pre-processor name. Note that it needs to be registered with
         * {@link Ext.Cl***REMOVED***#registerPreprocessor registerPreprocessor} before this
         * @param {String} offset The insertion position. Four possible values are:
         * 'first', 'last', or: 'before', 'after' (relative to the name provided in the third argument)
         * @param {String} relativeName
         * @return {Ext.Cl***REMOVED***} this
         * @static
         */
        setDefaultPreprocessorPosition: function(name, offset, relativeName) {
            var defaultPreprocessors = this.defaultPreprocessors,
                index;

            if (typeof offset == 'string') {
                if (offset === 'first') {
                    defaultPreprocessors.unshift(name);

                    return this;
                }
                else if (offset === 'last') {
                    defaultPreprocessors.push(name);

                    return this;
                }

                offset = (offset === 'after') ? 1 : -1;
            }

            index = Ext.Array.indexOf(defaultPreprocessors, relativeName);

            if (index !== -1) {
                Ext.Array.splice(defaultPreprocessors, Math.max(0, index + offset), 0, name);
            }

            return this;
        },

        configNameCache: {},

        getConfigNameMap: function(name) {
            var cache = this.configNameCache,
                map = cache[name],
                capitalizedName;

            if (!map) {
                capitalizedName = name.charAt(0).toUpperCase() + name.substr(1);

                map = cache[name] = {
                    internal: name,
                    initialized: '_is' + capitalizedName + 'Initialized',
                    apply: 'apply' + capitalizedName,
                    update: 'update' + capitalizedName,
                    'set': 'set' + capitalizedName,
                    'get': 'get' + capitalizedName,
                    doSet : 'doSet' + capitalizedName,
                    changeEvent: name.toLowerCase() + 'change'
                };
            }

            return map;
        }
    });

    /**
     * @cfg {String} extend
     * The parent cl***REMOVED*** that this cl***REMOVED*** extends. For example:
     *
     *     Ext.define('Person', {
     *         say: function(text) { alert(text); }
     *     });
     *
     *     Ext.define('Developer', {
     *         extend: 'Person',
     *         say: function(text) { this.callParent(["print "+text]); }
     *     });
     */
    ExtCl***REMOVED***.registerPreprocessor('extend', function(Cl***REMOVED***, data) {
        var Base = Ext.Base,
            basePrototype = Base.prototype,
            extend = data.extend,
            Parent, parentPrototype, i;

        delete data.extend;

        if (extend && extend !== Object) {
            Parent = extend;
        }
        else {
            Parent = Base;
        }

        parentPrototype = Parent.prototype;

        if (!Parent.$isCl***REMOVED***) {
            for (i in basePrototype) {
                if (!parentPrototype[i]) {
                    parentPrototype[i] = basePrototype[i];
                }
            }
        }

        Cl***REMOVED***.extend(Parent);

        Cl***REMOVED***.triggerExtended.apply(Cl***REMOVED***, arguments);

        if (data.onCl***REMOVED***Extended) {
            Cl***REMOVED***.onExtended(data.onCl***REMOVED***Extended, Cl***REMOVED***);
            delete data.onCl***REMOVED***Extended;
        }

    }, true);

    //<feature cl***REMOVED***System.statics>
    /**
     * @cfg {Object} statics
     * List of static methods for this cl***REMOVED***. For example:
     *
     *     Ext.define('Computer', {
     *          statics: {
     *              factory: function(brand) {
     *                  // 'this' in static methods refer to the cl***REMOVED*** itself
     *                  return new this(brand);
     *              }
     *          },
     *
     *          constructor: function() { ... }
     *     });
     *
     *     var dellComputer = Computer.factory('Dell');
     */
    ExtCl***REMOVED***.registerPreprocessor('statics', function(Cl***REMOVED***, data) {
        Cl***REMOVED***.addStatics(data.statics);

        delete data.statics;
    });
    //</feature>

    //<feature cl***REMOVED***System.inheritableStatics>
    /**
     * @cfg {Object} inheritableStatics
     * List of inheritable static methods for this cl***REMOVED***.
     * Otherwise just like {@link #statics} but subcl***REMOVED***es inherit these methods.
     */
    ExtCl***REMOVED***.registerPreprocessor('inheritableStatics', function(Cl***REMOVED***, data) {
        Cl***REMOVED***.addInheritableStatics(data.inheritableStatics);

        delete data.inheritableStatics;
    });
    //</feature>

    //<feature cl***REMOVED***System.config>
    /**
     * @cfg {Object} config
     * List of configuration options with their default values, for which automatically
     * accessor methods are generated.  For example:
     *
     *     Ext.define('SmartPhone', {
     *          config: {
     *              hasTouchScreen: false,
     *              operatingSystem: 'Other',
     *              price: 500
     *          },
     *          constructor: function(cfg) {
     *              this.initConfig(cfg);
     *          }
     *     });
     *
     *     var iPhone = new SmartPhone({
     *          hasTouchScreen: true,
     *          operatingSystem: 'iOS'
     *     });
     *
     *     iPhone.getPrice(); // 500;
     *     iPhone.getOperatingSystem(); // 'iOS'
     *     iPhone.getHasTouchScreen(); // true;
     */
    ExtCl***REMOVED***.registerPreprocessor('config', function(Cl***REMOVED***, data) {
        var config = data.config,
            prototype = Cl***REMOVED***.prototype;

        delete data.config;

        Ext.Object.each(config, function(name, value) {
            var nameMap = ExtCl***REMOVED***.getConfigNameMap(name),
                internalName = nameMap.internal,
                initializedName = nameMap.initialized,
                applyName = nameMap.apply,
                updateName = nameMap.update,
                setName = nameMap.set,
                getName = nameMap.get,
                hasOwnSetter = (setName in prototype) || data.hasOwnProperty(setName),
                hasOwnApplier = (applyName in prototype) || data.hasOwnProperty(applyName),
                hasOwnUpdater = (updateName in prototype) || data.hasOwnProperty(updateName),
                optimizedGetter, customGetter;

            if (value === null || (!hasOwnSetter && !hasOwnApplier && !hasOwnUpdater)) {
                prototype[internalName] = value;
                prototype[initializedName] = true;
            }
            else {
                prototype[initializedName] = false;
            }

            if (!hasOwnSetter) {
                data[setName] = function(value) {
                    var oldValue = this[internalName],
                        applier = this[applyName],
                        updater = this[updateName];

                    if (!this[initializedName]) {
                        this[initializedName] = true;
                    }

                    if (applier) {
                        value = applier.call(this, value, oldValue);
                    }

                    if (typeof value != 'undefined') {
                        this[internalName] = value;

                        if (updater && value !== oldValue) {
                            updater.call(this, value, oldValue);
                        }
                    }

                    return this;
                };
            }

            if (!(getName in prototype) || data.hasOwnProperty(getName)) {
                customGetter = data[getName] || false;

                if (customGetter) {
                    optimizedGetter = function() {
                        return customGetter.apply(this, arguments);
                    };
                }
                else {
                    optimizedGetter = function() {
                        return this[internalName];
                    };
                }

                data[getName] = function() {
                    var currentGetter;

                    if (!this[initializedName]) {
                        this[initializedName] = true;
                        this[setName](this.config[name]);
                    }

                    currentGetter = this[getName];

                    if ('$previous' in currentGetter) {
                        currentGetter.$previous = optimizedGetter;
                    }
                    else {
                        this[getName] = optimizedGetter;
                    }

                    return optimizedGetter.apply(this, arguments);
                };
            }
        });

        Cl***REMOVED***.addConfig(config, true);
    });
    //</feature>

    //<feature cl***REMOVED***System.mixins>
    /**
     * @cfg {String[]/Object} mixins
     * List of cl***REMOVED***es to mix into this cl***REMOVED***. For example:
     *
     *     Ext.define('CanSing', {
     *          sing: function() {
     *              alert("I'm on the highway to hell...")
     *          }
     *     });
     *
     *     Ext.define('Musician', {
     *          mixins: ['CanSing']
     *     })
     *
     * In this case the Musician cl***REMOVED*** will get a `sing` method from CanSing mixin.
     *
     * But what if the Musician already has a `sing` method? Or you want to mix
     * in two cl***REMOVED***es, both of which define `sing`?  In such a cases it's good
     * to define mixins as an object, where you ***REMOVED***ign a name to each mixin:
     *
     *     Ext.define('Musician', {
     *          mixins: {
     *              canSing: 'CanSing'
     *          },
     * 
     *          sing: function() {
     *              // delegate singing operation to mixin
     *              this.mixins.canSing.sing.call(this);
     *          }
     *     })
     *
     * In this case the `sing` method of Musician will overwrite the
     * mixed in `sing` method. But you can access the original mixed in method
     * through special `mixins` property.
     */
    ExtCl***REMOVED***.registerPreprocessor('mixins', function(Cl***REMOVED***, data, hooks) {
        var mixins = data.mixins,
            name, mixin, i, ln;

        delete data.mixins;

        Ext.Function.interceptBefore(hooks, 'onCreated', function() {
            if (mixins instanceof Array) {
                for (i = 0,ln = mixins.length; i < ln; i++) {
                    mixin = mixins[i];
                    name = mixin.prototype.mixinId || mixin.$cl***REMOVED***Name;

                    Cl***REMOVED***.mixin(name, mixin);
                }
            }
            else {
                for (var mixinName in mixins) {
                    if (mixins.hasOwnProperty(mixinName)) {
                        Cl***REMOVED***.mixin(mixinName, mixins[mixinName]);
                    }
                }
            }
        });
    });
    //</feature>

    //<feature cl***REMOVED***System.backwardsCompatible>
    // Backwards compatible
    Ext.extend = function(Cl***REMOVED***, Parent, members) {
        if (arguments.length === 2 && Ext.isObject(Parent)) {
            members = Parent;
            Parent = Cl***REMOVED***;
            Cl***REMOVED*** = null;
        }

        var cls;

        if (!Parent) {
            throw new Error("[Ext.extend] Attempting to extend from a cl***REMOVED*** which has not been loaded on the page.");
        }

        members.extend = Parent;
        members.preprocessors = [
            'extend'
            //<feature cl***REMOVED***System.statics>
            ,'statics'
            //</feature>
            //<feature cl***REMOVED***System.inheritableStatics>
            ,'inheritableStatics'
            //</feature>
            //<feature cl***REMOVED***System.mixins>
            ,'mixins'
            //</feature>
            //<feature cl***REMOVED***System.config>
            ,'config'
            //</feature>
        ];

        if (Cl***REMOVED***) {
            cls = new ExtCl***REMOVED***(Cl***REMOVED***, members);
            // The 'constructor' is given as 'Cl***REMOVED***' but also needs to be on prototype
            cls.prototype.constructor = Cl***REMOVED***;
        } else {
            cls = new ExtCl***REMOVED***(members);
        }

        cls.prototype.override = function(o) {
            for (var m in o) {
                if (o.hasOwnProperty(m)) {
                    this[m] = o[m];
                }
            }
        };

        return cls;
    };
    //</feature>

}());
