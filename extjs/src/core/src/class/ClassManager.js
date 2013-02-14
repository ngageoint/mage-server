//@tag foundation,core
//@require Cl***REMOVED***.js

/**
 * @author Jacky Nguyen <jacky@sencha.com>
 * @docauthor Jacky Nguyen <jacky@sencha.com>
 * @cl***REMOVED*** Ext.Cl***REMOVED***Manager
 *
 * Ext.Cl***REMOVED***Manager manages all cl***REMOVED***es and handles mapping from string cl***REMOVED*** name to
 * actual cl***REMOVED*** objects throughout the whole framework. It is not generally accessed directly, rather through
 * these convenient shorthands:
 *
 * - {@link Ext#define Ext.define}
 * - {@link Ext#create Ext.create}
 * - {@link Ext#widget Ext.widget}
 * - {@link Ext#getCl***REMOVED*** Ext.getCl***REMOVED***}
 * - {@link Ext#getCl***REMOVED***Name Ext.getCl***REMOVED***Name}
 *
 * # Basic syntax:
 *
 *     Ext.define(cl***REMOVED***Name, properties);
 *
 * in which `properties` is an object represent a collection of properties that apply to the cl***REMOVED***. See
 * {@link Ext.Cl***REMOVED***Manager#create} for more detailed instructions.
 *
 *     Ext.define('Person', {
 *          name: 'Unknown',
 *
 *          constructor: function(name) {
 *              if (name) {
 *                  this.name = name;
 *              }
 *          },
 *
 *          eat: function(foodType) {
 *              alert("I'm eating: " + foodType);
 *
 *              return this;
 *          }
 *     });
 *
 *     var aaron = new Person("Aaron");
 *     aaron.eat("Sandwich"); // alert("I'm eating: Sandwich");
 *
 * Ext.Cl***REMOVED*** has a powerful set of extensible {@link Ext.Cl***REMOVED***#registerPreprocessor pre-processors} which takes care of
 * everything related to cl***REMOVED*** creation, including but not limited to inheritance, mixins, configuration, statics, etc.
 *
 * # Inheritance:
 *
 *     Ext.define('Developer', {
 *          extend: 'Person',
 *
 *          constructor: function(name, isGeek) {
 *              this.isGeek = isGeek;
 *
 *              // Apply a method from the parent cl***REMOVED***' prototype
 *              this.callParent([name]);
 *          },
 *
 *          code: function(language) {
 *              alert("I'm coding in: " + language);
 *
 *              this.eat("Bugs");
 *
 *              return this;
 *          }
 *     });
 *
 *     var jacky = new Developer("Jacky", true);
 *     jacky.code("JavaScript"); // alert("I'm coding in: JavaScript");
 *                               // alert("I'm eating: Bugs");
 *
 * See {@link Ext.Base#callParent} for more details on calling supercl***REMOVED***' methods
 *
 * # Mixins:
 *
 *     Ext.define('CanPlayGuitar', {
 *          playGuitar: function() {
 *             alert("F#...G...D...A");
 *          }
 *     });
 *
 *     Ext.define('CanComposeSongs', {
 *          composeSongs: function() { ... }
 *     });
 *
 *     Ext.define('CanSing', {
 *          sing: function() {
 *              alert("I'm on the highway to hell...")
 *          }
 *     });
 *
 *     Ext.define('Musician', {
 *          extend: 'Person',
 *
 *          mixins: {
 *              canPlayGuitar: 'CanPlayGuitar',
 *              canComposeSongs: 'CanComposeSongs',
 *              canSing: 'CanSing'
 *          }
 *     })
 *
 *     Ext.define('CoolPerson', {
 *          extend: 'Person',
 *
 *          mixins: {
 *              canPlayGuitar: 'CanPlayGuitar',
 *              canSing: 'CanSing'
 *          },
 *
 *          sing: function() {
 *              alert("Ahem....");
 *
 *              this.mixins.canSing.sing.call(this);
 *
 *              alert("[Playing guitar at the same time...]");
 *
 *              this.playGuitar();
 *          }
 *     });
 *
 *     var me = new CoolPerson("Jacky");
 *
 *     me.sing(); // alert("Ahem...");
 *                // alert("I'm on the highway to hell...");
 *                // alert("[Playing guitar at the same time...]");
 *                // alert("F#...G...D...A");
 *
 * # Config:
 *
 *     Ext.define('SmartPhone', {
 *          config: {
 *              hasTouchScreen: false,
 *              operatingSystem: 'Other',
 *              price: 500
 *          },
 *
 *          isExpensive: false,
 *
 *          constructor: function(config) {
 *              this.initConfig(config);
 *          },
 *
 *          applyPrice: function(price) {
 *              this.isExpensive = (price > 500);
 *
 *              return price;
 *          },
 *
 *          applyOperatingSystem: function(operatingSystem) {
 *              if (!(/^(iOS|Android|BlackBerry)$/i).test(operatingSystem)) {
 *                  return 'Other';
 *              }
 *
 *              return operatingSystem;
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
 *     iPhone.hasTouchScreen(); // true
 *
 *     iPhone.isExpensive; // false;
 *     iPhone.setPrice(600);
 *     iPhone.getPrice(); // 600
 *     iPhone.isExpensive; // true;
 *
 *     iPhone.setOperatingSystem('AlienOS');
 *     iPhone.getOperatingSystem(); // 'Other'
 *
 * # Statics:
 *
 *     Ext.define('Computer', {
 *          statics: {
 *              factory: function(brand) {
 *                 // 'this' in static methods refer to the cl***REMOVED*** itself
 *                  return new this(brand);
 *              }
 *          },
 *
 *          constructor: function() { ... }
 *     });
 *
 *     var dellComputer = Computer.factory('Dell');
 *
 * Also see {@link Ext.Base#statics} and {@link Ext.Base#self} for more details on accessing
 * static properties within cl***REMOVED*** methods
 *
 * @singleton
 */
(function(Cl***REMOVED***, alias, arraySlice, arrayFrom, global) {

    // Creates a constructor that has nothing extra in its scope chain.
    function makeCtor () {
        function constructor () {
            // Opera has some problems returning from a constructor when Dragonfly isn't running. The || null seems to
            // be sufficient to stop it misbehaving. Known to be required against 10.53, 11.51 and 11.61.
            return this.constructor.apply(this, arguments) || null;
        }
        return constructor;
    }

    var Manager = Ext.Cl***REMOVED***Manager = {

        /**
         * @property {Object} cl***REMOVED***es
         * All cl***REMOVED***es which were defined through the Cl***REMOVED***Manager. Keys are the
         * name of the cl***REMOVED***es and the values are references to the cl***REMOVED***es.
         * @private
         */
        cl***REMOVED***es: {},

        /**
         * @private
         */
        existCache: {},

        /**
         * @private
         */
        namespaceRewrites: [{
            from: 'Ext.',
            to: Ext
        }],

        /**
         * @private
         */
        maps: {
            alternateToName: {},
            aliasToName: {},
            nameToAliases: {},
            nameToAlternates: {}
        },

        /** @private */
        enableNamespaceParseCache: true,

        /** @private */
        namespaceParseCache: {},

        /** @private */
        instantiators: [],

        /**
         * Checks if a cl***REMOVED*** has already been created.
         *
         * @param {String} cl***REMOVED***Name
         * @return {Boolean} exist
         */
        isCreated: function(cl***REMOVED***Name) {
            var existCache = this.existCache,
                i, ln, part, root, parts;

            //<debug error>
            if (typeof cl***REMOVED***Name != 'string' || cl***REMOVED***Name.length < 1) {
                throw new Error("[Ext.Cl***REMOVED***Manager] Invalid cl***REMOVED***name, must be a string and must not be empty");
            }
            //</debug>

            if (this.cl***REMOVED***es[cl***REMOVED***Name] || existCache[cl***REMOVED***Name]) {
                return true;
            }

            root = global;
            parts = this.parseNamespace(cl***REMOVED***Name);

            for (i = 0, ln = parts.length; i < ln; i++) {
                part = parts[i];

                if (typeof part != 'string') {
                    root = part;
                } else {
                    if (!root || !root[part]) {
                        return false;
                    }

                    root = root[part];
                }
            }

            existCache[cl***REMOVED***Name] = true;

            this.triggerCreated(cl***REMOVED***Name);

            return true;
        },

        /**
         * @private
         */
        createdListeners: [],

        /**
         * @private
         */
        nameCreatedListeners: {},

        /**
         * @private
         */
        triggerCreated: function(cl***REMOVED***Name) {
            var listeners = this.createdListeners,
                nameListeners = this.nameCreatedListeners,
                alternateNames = this.maps.nameToAlternates[cl***REMOVED***Name],
                names = [cl***REMOVED***Name],
                i, ln, j, subLn, listener, name;

            for (i = 0,ln = listeners.length; i < ln; i++) {
                listener = listeners[i];
                listener.fn.call(listener.scope, cl***REMOVED***Name);
            }

            if (alternateNames) {
                names.push.apply(names, alternateNames);
            }

            for (i = 0,ln = names.length; i < ln; i++) {
                name = names[i];
                listeners = nameListeners[name];

                if (listeners) {
                    for (j = 0,subLn = listeners.length; j < subLn; j++) {
                        listener = listeners[j];
                        listener.fn.call(listener.scope, name);
                    }
                    delete nameListeners[name];
                }
            }
        },

        /**
         * @private
         */
        onCreated: function(fn, scope, cl***REMOVED***Name) {
            var listeners = this.createdListeners,
                nameListeners = this.nameCreatedListeners,
                listener = {
                    fn: fn,
                    scope: scope
                };

            if (cl***REMOVED***Name) {
                if (this.isCreated(cl***REMOVED***Name)) {
                    fn.call(scope, cl***REMOVED***Name);
                    return;
                }

                if (!nameListeners[cl***REMOVED***Name]) {
                    nameListeners[cl***REMOVED***Name] = [];
                }

                nameListeners[cl***REMOVED***Name].push(listener);
            }
            else {
                listeners.push(listener);
            }
        },

        /**
         * Supports namespace rewriting
         * @private
         */
        parseNamespace: function(namespace) {
            //<debug error>
            if (typeof namespace != 'string') {
                throw new Error("[Ext.Cl***REMOVED***Manager] Invalid namespace, must be a string");
            }
            //</debug>

            var cache = this.namespaceParseCache,
                parts,
                rewrites,
                root,
                name,
                rewrite, from, to, i, ln;

            if (this.enableNamespaceParseCache) {
                if (cache.hasOwnProperty(namespace)) {
                    return cache[namespace];
                }
            }

            parts = [];
            rewrites = this.namespaceRewrites;
            root = global;
            name = namespace;

            for (i = 0, ln = rewrites.length; i < ln; i++) {
                rewrite = rewrites[i];
                from = rewrite.from;
                to = rewrite.to;

                if (name === from || name.substring(0, from.length) === from) {
                    name = name.substring(from.length);

                    if (typeof to != 'string') {
                        root = to;
                    } else {
                        parts = parts.concat(to.split('.'));
                    }

                    break;
                }
            }

            parts.push(root);

            parts = parts.concat(name.split('.'));

            if (this.enableNamespaceParseCache) {
                cache[namespace] = parts;
            }

            return parts;
        },

        /**
         * Creates a namespace and ***REMOVED***ign the `value` to the created object
         *
         *     Ext.Cl***REMOVED***Manager.setNamespace('MyCompany.pkg.Example', someObject);
         *
         *     alert(MyCompany.pkg.Example === someObject); // alerts true
         *
         * @param {String} name
         * @param {Object} value
         */
        setNamespace: function(name, value) {
            var root = global,
                parts = this.parseNamespace(name),
                ln = parts.length - 1,
                leaf = parts[ln],
                i, part;

            for (i = 0; i < ln; i++) {
                part = parts[i];

                if (typeof part != 'string') {
                    root = part;
                } else {
                    if (!root[part]) {
                        root[part] = {};
                    }

                    root = root[part];
                }
            }

            root[leaf] = value;

            return root[leaf];
        },

        /**
         * The new Ext.ns, supports namespace rewriting
         * @private
         */
        createNamespaces: function() {
            var root = global,
                parts, part, i, j, ln, subLn;

            for (i = 0, ln = arguments.length; i < ln; i++) {
                parts = this.parseNamespace(arguments[i]);

                for (j = 0, subLn = parts.length; j < subLn; j++) {
                    part = parts[j];

                    if (typeof part != 'string') {
                        root = part;
                    } else {
                        if (!root[part]) {
                            root[part] = {};
                        }

                        root = root[part];
                    }
                }
            }

            return root;
        },

        /**
         * Sets a name reference to a cl***REMOVED***.
         *
         * @param {String} name
         * @param {Object} value
         * @return {Ext.Cl***REMOVED***Manager} this
         */
        set: function(name, value) {
            var me = this,
                maps = me.maps,
                nameToAlternates = maps.nameToAlternates,
                targetName = me.getName(value),
                alternates;

            me.cl***REMOVED***es[name] = me.setNamespace(name, value);

            if (targetName && targetName !== name) {
                maps.alternateToName[name] = targetName;
                alternates = nameToAlternates[targetName] || (nameToAlternates[targetName] = []);
                alternates.push(name);
            }

            return this;
        },

        /**
         * Retrieve a cl***REMOVED*** by its name.
         *
         * @param {String} name
         * @return {Ext.Cl***REMOVED***} cl***REMOVED***
         */
        get: function(name) {
            var cl***REMOVED***es = this.cl***REMOVED***es,
                root,
                parts,
                part, i, ln;

            if (cl***REMOVED***es[name]) {
                return cl***REMOVED***es[name];
            }

            root = global;
            parts = this.parseNamespace(name);

            for (i = 0, ln = parts.length; i < ln; i++) {
                part = parts[i];

                if (typeof part != 'string') {
                    root = part;
                } else {
                    if (!root || !root[part]) {
                        return null;
                    }

                    root = root[part];
                }
            }

            return root;
        },

        /**
         * Register the alias for a cl***REMOVED***.
         *
         * @param {Ext.Cl***REMOVED***/String} cls a reference to a cl***REMOVED*** or a cl***REMOVED***Name
         * @param {String} alias Alias to use when referring to this cl***REMOVED***
         */
        setAlias: function(cls, alias) {
            var aliasToNameMap = this.maps.aliasToName,
                nameToAliasesMap = this.maps.nameToAliases,
                cl***REMOVED***Name;

            if (typeof cls == 'string') {
                cl***REMOVED***Name = cls;
            } else {
                cl***REMOVED***Name = this.getName(cls);
            }

            if (alias && aliasToNameMap[alias] !== cl***REMOVED***Name) {
                //<debug info>
                if (aliasToNameMap[alias] && Ext.isDefined(global.console)) {
                    global.console.log("[Ext.Cl***REMOVED***Manager] Overriding existing alias: '" + alias + "' " +
                        "of: '" + aliasToNameMap[alias] + "' with: '" + cl***REMOVED***Name + "'. Be sure it's intentional.");
                }
                //</debug>

                aliasToNameMap[alias] = cl***REMOVED***Name;
            }

            if (!nameToAliasesMap[cl***REMOVED***Name]) {
                nameToAliasesMap[cl***REMOVED***Name] = [];
            }

            if (alias) {
                Ext.Array.include(nameToAliasesMap[cl***REMOVED***Name], alias);
            }

            return this;
        },

        /**
         * Adds a batch of cl***REMOVED*** name to alias mappings
         * @param {Object} aliases The set of mappings of the form
         * cl***REMOVED***Name : [values...]
         */
        addNameAliasMappings: function(aliases){
            var aliasToNameMap = this.maps.aliasToName,
                nameToAliasesMap = this.maps.nameToAliases,
                cl***REMOVED***Name, aliasList, alias, i;

            for (cl***REMOVED***Name in aliases) {
                aliasList = nameToAliasesMap[cl***REMOVED***Name] ||
                    (nameToAliasesMap[cl***REMOVED***Name] = []);

                for (i = 0; i < aliases[cl***REMOVED***Name].length; i++) {
                    alias = aliases[cl***REMOVED***Name][i];
                    if (!aliasToNameMap[alias]) {
                        aliasToNameMap[alias] = cl***REMOVED***Name;
                        aliasList.push(alias);
                    }
                }

            }
            return this;
        },

        /**
         *
         * @param {Object} alternates The set of mappings of the form
         * cl***REMOVED***Name : [values...]
         */
        addNameAlternateMappings: function(alternates) {
            var alternateToName = this.maps.alternateToName,
                nameToAlternates = this.maps.nameToAlternates,
                cl***REMOVED***Name, aliasList, alternate, i;

            for (cl***REMOVED***Name in alternates) {
                aliasList = nameToAlternates[cl***REMOVED***Name] ||
                    (nameToAlternates[cl***REMOVED***Name] = []);

                for (i  = 0; i < alternates[cl***REMOVED***Name].length; i++) {
                    alternate = alternates[cl***REMOVED***Name];
                    if (!alternateToName[alternate]) {
                        alternateToName[alternate] = cl***REMOVED***Name;
                        aliasList.push(alternate);
                    }
                }

            }
            return this;
        },

        /**
         * Get a reference to the cl***REMOVED*** by its alias.
         *
         * @param {String} alias
         * @return {Ext.Cl***REMOVED***} cl***REMOVED***
         */
        getByAlias: function(alias) {
            return this.get(this.getNameByAlias(alias));
        },

        /**
         * Get the name of a cl***REMOVED*** by its alias.
         *
         * @param {String} alias
         * @return {String} cl***REMOVED***Name
         */
        getNameByAlias: function(alias) {
            return this.maps.aliasToName[alias] || '';
        },

        /**
         * Get the name of a cl***REMOVED*** by its alternate name.
         *
         * @param {String} alternate
         * @return {String} cl***REMOVED***Name
         */
        getNameByAlternate: function(alternate) {
            return this.maps.alternateToName[alternate] || '';
        },

        /**
         * Get the aliases of a cl***REMOVED*** by the cl***REMOVED*** name
         *
         * @param {String} name
         * @return {Array} aliases
         */
        getAliasesByName: function(name) {
            return this.maps.nameToAliases[name] || [];
        },

        /**
         * Get the name of the cl***REMOVED*** by its reference or its instance;
         * usually invoked by the shorthand {@link Ext#getCl***REMOVED***Name Ext.getCl***REMOVED***Name}
         *
         *     Ext.Cl***REMOVED***Manager.getName(Ext.Action); // returns "Ext.Action"
         *
         * @param {Ext.Cl***REMOVED***/Object} object
         * @return {String} cl***REMOVED***Name
         */
        getName: function(object) {
            return object && object.$cl***REMOVED***Name || '';
        },

        /**
         * Get the cl***REMOVED*** of the provided object; returns null if it's not an instance
         * of any cl***REMOVED*** created with Ext.define. This is usually invoked by the shorthand {@link Ext#getCl***REMOVED*** Ext.getCl***REMOVED***}
         *
         *     var component = new Ext.Component();
         *
         *     Ext.Cl***REMOVED***Manager.getCl***REMOVED***(component); // returns Ext.Component
         *
         * @param {Object} object
         * @return {Ext.Cl***REMOVED***} cl***REMOVED***
         */
        getCl***REMOVED***: function(object) {
            return object && object.self || null;
        },

        /**
         * Defines a cl***REMOVED***.
         * @deprecated 4.1.0 Use {@link Ext#define} instead, as that also supports creating overrides.
         */
        create: function(cl***REMOVED***Name, data, createdFn) {
            //<debug error>
            if (cl***REMOVED***Name != null && typeof cl***REMOVED***Name != 'string') {
                throw new Error("[Ext.define] Invalid cl***REMOVED*** name '" + cl***REMOVED***Name + "' specified, must be a non-empty string");
            }
            //</debug>

            var ctor = makeCtor();
            if (typeof data == 'function') {
                data = data(ctor);
            }

            //<debug>
            if (cl***REMOVED***Name) {
                ctor.displayName = cl***REMOVED***Name;
            }
            //</debug>

            data.$cl***REMOVED***Name = cl***REMOVED***Name;

            return new Cl***REMOVED***(ctor, data, function() {
                var postprocessorStack = data.postprocessors || Manager.defaultPostprocessors,
                    registeredPostprocessors = Manager.postprocessors,
                    postprocessors = [],
                    postprocessor, i, ln, j, subLn, postprocessorProperties, postprocessorProperty;

                delete data.postprocessors;

                for (i = 0,ln = postprocessorStack.length; i < ln; i++) {
                    postprocessor = postprocessorStack[i];

                    if (typeof postprocessor == 'string') {
                        postprocessor = registeredPostprocessors[postprocessor];
                        postprocessorProperties = postprocessor.properties;

                        if (postprocessorProperties === true) {
                            postprocessors.push(postprocessor.fn);
                        }
                        else if (postprocessorProperties) {
                            for (j = 0,subLn = postprocessorProperties.length; j < subLn; j++) {
                                postprocessorProperty = postprocessorProperties[j];

                                if (data.hasOwnProperty(postprocessorProperty)) {
                                    postprocessors.push(postprocessor.fn);
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        postprocessors.push(postprocessor);
                    }
                }

                data.postprocessors = postprocessors;
                data.createdFn = createdFn;
                Manager.processCreate(cl***REMOVED***Name, this, data);
            });
        },
        
        processCreate: function(cl***REMOVED***Name, cls, clsData){
            var me = this,
                postprocessor = clsData.postprocessors.shift(),
                createdFn = clsData.createdFn;

            if (!postprocessor) {
                if (cl***REMOVED***Name) {
                    me.set(cl***REMOVED***Name, cls);
                }

                if (createdFn) {
                    createdFn.call(cls, cls);
                }

                if (cl***REMOVED***Name) {
                    me.triggerCreated(cl***REMOVED***Name);
                }
                return;
            }

            if (postprocessor.call(me, cl***REMOVED***Name, cls, clsData, me.processCreate) !== false) {
                me.processCreate(cl***REMOVED***Name, cls, clsData);
            }
        },

        createOverride: function (cl***REMOVED***Name, data, createdFn) {
            var me = this,
                overriddenCl***REMOVED***Name = data.override,
                requires = data.requires,
                uses = data.uses,
                cl***REMOVED***Ready = function () {
                    var cls, temp;

                    if (requires) {
                        temp = requires;
                        requires = null; // do the real thing next time (which may be now)

                        // Since the override is going to be used (its target cl***REMOVED*** is now
                        // created), we need to fetch the required cl***REMOVED***es for the override
                        // and call us back once they are loaded:
                        Ext.Loader.require(temp, cl***REMOVED***Ready);
                    } else {
                        // The target cl***REMOVED*** and the required cl***REMOVED***es for this override are
                        // ready, so we can apply the override now:
                        cls = me.get(overriddenCl***REMOVED***Name);

                        // We don't want to apply these:
                        delete data.override;
                        delete data.requires;
                        delete data.uses;

                        Ext.override(cls, data);

                        // This pushes the overridding file itself into Ext.Loader.history
                        // Hence if the target cl***REMOVED*** never exists, the overriding file will
                        // never be included in the build.
                        me.triggerCreated(cl***REMOVED***Name);

                        if (uses) {
                            Ext.Loader.addUsedCl***REMOVED***es(uses); // get these cl***REMOVED***es too!
                        }

                        if (createdFn) {
                            createdFn.call(cls); // last but not least!
                        }
                    }
                };

            me.existCache[cl***REMOVED***Name] = true;

            // Override the target cl***REMOVED*** right after it's created
            me.onCreated(cl***REMOVED***Ready, me, overriddenCl***REMOVED***Name);
 
            return me;
        },

        /**
         * Instantiate a cl***REMOVED*** by its alias; usually invoked by the convenient shorthand {@link Ext#createByAlias Ext.createByAlias}
         * If {@link Ext.Loader} is {@link Ext.Loader#setConfig enabled} and the cl***REMOVED*** has not been defined yet, it will
         * attempt to load the cl***REMOVED*** via synchronous loading.
         *
         *     var window = Ext.Cl***REMOVED***Manager.instantiateByAlias('widget.window', { width: 600, height: 800, ... });
         *
         * @param {String} alias
         * @param {Object...} args Additional arguments after the alias will be p***REMOVED***ed to the
         * cl***REMOVED*** constructor.
         * @return {Object} instance
         */
        instantiateByAlias: function() {
            var alias = arguments[0],
                args = arraySlice.call(arguments),
                cl***REMOVED***Name = this.getNameByAlias(alias);

            if (!cl***REMOVED***Name) {
                cl***REMOVED***Name = this.maps.aliasToName[alias];

                //<debug error>
                if (!cl***REMOVED***Name) {
                    throw new Error("[Ext.createByAlias] Cannot create an instance of unrecognized alias: " + alias);
                }
                //</debug>

                //<debug warn>
                if (global.console) {
                    global.console.warn("[Ext.Loader] Synchronously loading '" + cl***REMOVED***Name + "'; consider adding " +
                         "Ext.require('" + alias + "') above Ext.onReady");
                }
                //</debug>

                Ext.syncRequire(cl***REMOVED***Name);
            }

            args[0] = cl***REMOVED***Name;

            return this.instantiate.apply(this, args);
        },

        /**
         * @private
         */
        instantiate: function() {
            var name = arguments[0],
                nameType = typeof name,
                args = arraySlice.call(arguments, 1),
                alias = name,
                possibleName, cls;

            if (nameType != 'function') {
                if (nameType != 'string' && args.length === 0) {
                    args = [name];
                    name = name.xcl***REMOVED***;
                }

                //<debug error>
                if (typeof name != 'string' || name.length < 1) {
                    throw new Error("[Ext.create] Invalid cl***REMOVED*** name or alias '" + name + "' specified, must be a non-empty string");
                }
                //</debug>

                cls = this.get(name);
            }
            else {
                cls = name;
            }

            // No record of this cl***REMOVED*** name, it's possibly an alias, so look it up
            if (!cls) {
                possibleName = this.getNameByAlias(name);

                if (possibleName) {
                    name = possibleName;

                    cls = this.get(name);
                }
            }

            // Still no record of this cl***REMOVED*** name, it's possibly an alternate name, so look it up
            if (!cls) {
                possibleName = this.getNameByAlternate(name);

                if (possibleName) {
                    name = possibleName;

                    cls = this.get(name);
                }
            }

            // Still not existing at this point, try to load it via synchronous mode as the last resort
            if (!cls) {
                //<debug warn>
                if (global.console) {
                    global.console.warn("[Ext.Loader] Synchronously loading '" + name + "'; consider adding " +
                         "Ext.require('" + ((possibleName) ? alias : name) + "') above Ext.onReady");
                }
                //</debug>

                Ext.syncRequire(name);

                cls = this.get(name);
            }

            //<debug error>
            if (!cls) {
                throw new Error("[Ext.create] Cannot create an instance of unrecognized cl***REMOVED*** name / alias: " + alias);
            }

            if (typeof cls != 'function') {
                throw new Error("[Ext.create] '" + name + "' is a singleton and cannot be instantiated");
            }
            //</debug>

            return this.getInstantiator(args.length)(cls, args);
        },

        /**
         * @private
         * @param name
         * @param args
         */
        dynInstantiate: function(name, args) {
            args = arrayFrom(args, true);
            args.unshift(name);

            return this.instantiate.apply(this, args);
        },

        /**
         * @private
         * @param length
         */
        getInstantiator: function(length) {
            var instantiators = this.instantiators,
                instantiator,
                i,
                args;

            instantiator = instantiators[length];

            if (!instantiator) {
                i = length;
                args = [];

                for (i = 0; i < length; i++) {
                    args.push('a[' + i + ']');
                }

                instantiator = instantiators[length] = new Function('c', 'a', 'return new c(' + args.join(',') + ')');
                //<debug>
                instantiator.displayName = "Ext.Cl***REMOVED***Manager.instantiate" + length;
                //</debug>
            }

            return instantiator;
        },

        /**
         * @private
         */
        postprocessors: {},

        /**
         * @private
         */
        defaultPostprocessors: [],

        /**
         * Register a post-processor function.
         *
         * @private
         * @param {String} name
         * @param {Function} postprocessor
         */
        registerPostprocessor: function(name, fn, properties, position, relativeTo) {
            if (!position) {
                position = 'last';
            }

            if (!properties) {
                properties = [name];
            }

            this.postprocessors[name] = {
                name: name,
                properties: properties || false,
                fn: fn
            };

            this.setDefaultPostprocessorPosition(name, position, relativeTo);

            return this;
        },

        /**
         * Set the default post processors array stack which are applied to every cl***REMOVED***.
         *
         * @private
         * @param {String/Array} The name of a registered post processor or an array of registered names.
         * @return {Ext.Cl***REMOVED***Manager} this
         */
        setDefaultPostprocessors: function(postprocessors) {
            this.defaultPostprocessors = arrayFrom(postprocessors);

            return this;
        },

        /**
         * Insert this post-processor at a specific position in the stack, optionally relative to
         * any existing post-processor
         *
         * @private
         * @param {String} name The post-processor name. Note that it needs to be registered with
         * {@link Ext.Cl***REMOVED***Manager#registerPostprocessor} before this
         * @param {String} offset The insertion position. Four possible values are:
         * 'first', 'last', or: 'before', 'after' (relative to the name provided in the third argument)
         * @param {String} relativeName
         * @return {Ext.Cl***REMOVED***Manager} this
         */
        setDefaultPostprocessorPosition: function(name, offset, relativeName) {
            var defaultPostprocessors = this.defaultPostprocessors,
                index;

            if (typeof offset == 'string') {
                if (offset === 'first') {
                    defaultPostprocessors.unshift(name);

                    return this;
                }
                else if (offset === 'last') {
                    defaultPostprocessors.push(name);

                    return this;
                }

                offset = (offset === 'after') ? 1 : -1;
            }

            index = Ext.Array.indexOf(defaultPostprocessors, relativeName);

            if (index !== -1) {
                Ext.Array.splice(defaultPostprocessors, Math.max(0, index + offset), 0, name);
            }

            return this;
        },

        /**
         * Converts a string expression to an array of matching cl***REMOVED*** names. An expression can either refers to cl***REMOVED*** aliases
         * or cl***REMOVED*** names. Expressions support wildcards:
         *
         *      // returns ['Ext.window.Window']
         *     var window = Ext.Cl***REMOVED***Manager.getNamesByExpression('widget.window');
         *
         *     // returns ['widget.panel', 'widget.window', ...]
         *     var allWidgets = Ext.Cl***REMOVED***Manager.getNamesByExpression('widget.*');
         *
         *     // returns ['Ext.data.Store', 'Ext.data.ArrayProxy', ...]
         *     var allData = Ext.Cl***REMOVED***Manager.getNamesByExpression('Ext.data.*');
         *
         * @param {String} expression
         * @return {String[]} cl***REMOVED***Names
         */
        getNamesByExpression: function(expression) {
            var nameToAliasesMap = this.maps.nameToAliases,
                names = [],
                name, alias, aliases, possibleName, regex, i, ln;

            //<debug error>
            if (typeof expression != 'string' || expression.length < 1) {
                throw new Error("[Ext.Cl***REMOVED***Manager.getNamesByExpression] Expression " + expression + " is invalid, must be a non-empty string");
            }
            //</debug>

            if (expression.indexOf('*') !== -1) {
                expression = expression.replace(/\*/g, '(.*?)');
                regex = new RegExp('^' + expression + '$');

                for (name in nameToAliasesMap) {
                    if (nameToAliasesMap.hasOwnProperty(name)) {
                        aliases = nameToAliasesMap[name];

                        if (name.search(regex) !== -1) {
                            names.push(name);
                        }
                        else {
                            for (i = 0, ln = aliases.length; i < ln; i++) {
                                alias = aliases[i];

                                if (alias.search(regex) !== -1) {
                                    names.push(name);
                                    break;
                                }
                            }
                        }
                    }
                }

            } else {
                possibleName = this.getNameByAlias(expression);

                if (possibleName) {
                    names.push(possibleName);
                } else {
                    possibleName = this.getNameByAlternate(expression);

                    if (possibleName) {
                        names.push(possibleName);
                    } else {
                        names.push(expression);
                    }
                }
            }

            return names;
        }
    };

    //<feature cl***REMOVED***System.alias>
    /**
     * @cfg {String[]} alias
     * @member Ext.Cl***REMOVED***
     * List of short aliases for cl***REMOVED*** names.  Most useful for defining xtypes for widgets:
     *
     *     Ext.define('MyApp.CoolPanel', {
     *         extend: 'Ext.panel.Panel',
     *         alias: ['widget.coolpanel'],
     *         title: 'Yeah!'
     *     });
     *
     *     // Using Ext.create
     *     Ext.create('widget.coolpanel');
     *
     *     // Using the shorthand for defining widgets by xtype
     *     Ext.widget('panel', {
     *         items: [
     *             {xtype: 'coolpanel', html: 'Foo'},
     *             {xtype: 'coolpanel', html: 'Bar'}
     *         ]
     *     });
     *
     * Besides "widget" for xtype there are alias namespaces like "feature" for ftype and "plugin" for ptype.
     */
    Manager.registerPostprocessor('alias', function(name, cls, data) {
        var aliases = data.alias,
            i, ln;

        for (i = 0,ln = aliases.length; i < ln; i++) {
            alias = aliases[i];

            this.setAlias(cls, alias);
        }

    }, ['xtype', 'alias']);
    //</feature>

    //<feature cl***REMOVED***System.singleton>
    /**
     * @cfg {Boolean} singleton
     * @member Ext.Cl***REMOVED***
     * When set to true, the cl***REMOVED*** will be instantiated as singleton.  For example:
     *
     *     Ext.define('Logger', {
     *         singleton: true,
     *         log: function(msg) {
     *             console.log(msg);
     *         }
     *     });
     *
     *     Logger.log('Hello');
     */
    Manager.registerPostprocessor('singleton', function(name, cls, data, fn) {
        fn.call(this, name, new cls(), data);
        return false;
    });
    //</feature>

    //<feature cl***REMOVED***System.alternateCl***REMOVED***Name>
    /**
     * @cfg {String/String[]} alternateCl***REMOVED***Name
     * @member Ext.Cl***REMOVED***
     * Defines alternate names for this cl***REMOVED***.  For example:
     *
     *     Ext.define('Developer', {
     *         alternateCl***REMOVED***Name: ['Coder', 'Hacker'],
     *         code: function(msg) {
     *             alert('Typing... ' + msg);
     *         }
     *     });
     *
     *     var joe = Ext.create('Developer');
     *     joe.code('stackoverflow');
     *
     *     var rms = Ext.create('Hacker');
     *     rms.code('hack hack');
     */
    Manager.registerPostprocessor('alternateCl***REMOVED***Name', function(name, cls, data) {
        var alternates = data.alternateCl***REMOVED***Name,
            i, ln, alternate;

        if (!(alternates instanceof Array)) {
            alternates = [alternates];
        }

        for (i = 0, ln = alternates.length; i < ln; i++) {
            alternate = alternates[i];

            //<debug error>
            if (typeof alternate != 'string') {
                throw new Error("[Ext.define] Invalid alternate of: '" + alternate + "' for cl***REMOVED***: '" + name + "'; must be a valid string");
            }
            //</debug>

            this.set(alternate, cls);
        }
    });
    //</feature>

    Ext.apply(Ext, {
        /**
         * Instantiate a cl***REMOVED*** by either full name, alias or alternate name.
         *
         * If {@link Ext.Loader} is {@link Ext.Loader#setConfig enabled} and the cl***REMOVED*** has
         * not been defined yet, it will attempt to load the cl***REMOVED*** via synchronous loading.
         *
         * For example, all these three lines return the same result:
         *
         *      // alias
         *      var window = Ext.create('widget.window', {
         *          width: 600,
         *          height: 800,
         *          ...
         *      });
         *
         *      // alternate name
         *      var window = Ext.create('Ext.Window', {
         *          width: 600,
         *          height: 800,
         *          ...
         *      });
         *
         *      // full cl***REMOVED*** name
         *      var window = Ext.create('Ext.window.Window', {
         *          width: 600,
         *          height: 800,
         *          ...
         *      });
         *
         *      // single object with xcl***REMOVED*** property:
         *      var window = Ext.create({
         *          xcl***REMOVED***: 'Ext.window.Window', // any valid value for 'name' (above)
         *          width: 600,
         *          height: 800,
         *          ...
         *      });
         *
         * @param {String} [name] The cl***REMOVED*** name or alias. Can be specified as `xcl***REMOVED***`
         * property if only one object parameter is specified.
         * @param {Object...} [args] Additional arguments after the name will be p***REMOVED***ed to
         * the cl***REMOVED***' constructor.
         * @return {Object} instance
         * @member Ext
         * @method create
         */
        create: alias(Manager, 'instantiate'),

        /**
         * Convenient shorthand to create a widget by its xtype or a config object.
         * See also {@link Ext.Cl***REMOVED***Manager#instantiateByAlias}.
         *
         *      var button = Ext.widget('button'); // Equivalent to Ext.create('widget.button');
         *
         *      var panel = Ext.widget('panel', { // Equivalent to Ext.create('widget.panel')
         *          title: 'Panel'
         *      });
         *
         *      var grid = Ext.widget({
         *          xtype: 'grid',
         *          ...
         *      });
         *
         * If a {@link Ext.Component component} instance is p***REMOVED***ed, it is simply returned.
         *
         * @member Ext
         * @param {String} [name] The xtype of the widget to create.
         * @param {Object} [config] The configuration object for the widget constructor.
         * @return {Object} The widget instance
         */
        widget: function(name, config) {
            // forms:
            //      1: (xtype)
            //      2: (xtype, config)
            //      3: (config)
            //      4: (xtype, component)
            //      5: (component)
            //      
            var xtype = name,
                alias, cl***REMOVED***Name, T, load;

            if (typeof xtype != 'string') { // if (form 3 or 5)
                // first arg is config or component
                config = name; // arguments[0]
                xtype = config.xtype;
            } else {
                config = config || {};
            }
            
            if (config.isComponent) {
                return config;
            }

            alias = 'widget.' + xtype;
            cl***REMOVED***Name = Manager.getNameByAlias(alias);

            // this is needed to support demand loading of the cl***REMOVED***
            if (!cl***REMOVED***Name) {
                load = true;
            }
            
            T = Manager.get(cl***REMOVED***Name);
            if (load || !T) {
                return Manager.instantiateByAlias(alias, config);
            }
            return new T(config);
        },

        /**
         * Convenient shorthand, see {@link Ext.Cl***REMOVED***Manager#instantiateByAlias}
         * @member Ext
         * @method createByAlias
         */
        createByAlias: alias(Manager, 'instantiateByAlias'),

        /**
         * @method
         * Defines a cl***REMOVED*** or override. A basic cl***REMOVED*** is defined like this:
         *
         *      Ext.define('My.awesome.Cl***REMOVED***', {
         *          someProperty: 'something',
         *
         *          someMethod: function(s) {
         *              alert(s + this.someProperty);
         *          }
         *
         *          ...
         *      });
         *
         *      var obj = new My.awesome.Cl***REMOVED***();
         *
         *      obj.someMethod('Say '); // alerts 'Say something'
         *
         * To create an anonymous cl***REMOVED***, p***REMOVED*** `null` for the `cl***REMOVED***Name`:
         * 
         *      Ext.define(null, {
         *          constructor: function () {
         *              // ...
         *          }
         *      });
         *
         * In some cases, it is helpful to create a nested scope to contain some private
         * properties. The best way to do this is to p***REMOVED*** a function instead of an object
         * as the second parameter. This function will be called to produce the cl***REMOVED***
         * body:
         * 
         *      Ext.define('MyApp.foo.Bar', function () {
         *          var id = 0;
         *          
         *          return {
         *              nextId: function () {
         *                  return ++id;
         *              }
         *          };
         *      });
         * 
         * When using this form of `Ext.define`, the function is p***REMOVED***ed a reference to its
         * cl***REMOVED***. This can be used as an efficient way to access any static properties you
         * may have:
         * 
         *      Ext.define('MyApp.foo.Bar', function (Bar) {
         *          return {
         *              statics: {
         *                  staticMethod: function () {
         *                      // ...
         *                  }
         *              },
         *              
         *              method: function () {
         *                  return Bar.staticMethod();
         *              }
         *          };
         *      });
         *
         * To define an override, include the `override` property. The content of an
         * override is aggregated with the specified cl***REMOVED*** in order to extend or modify
         * that cl***REMOVED***. This can be as simple as setting default property values or it can
         * extend and/or replace methods. This can also extend the statics of the cl***REMOVED***.
         *
         * One use for an override is to break a large cl***REMOVED*** into manageable pieces.
         *
         *      // File: /src/app/Panel.js
         *
         *      Ext.define('My.app.Panel', {
         *          extend: 'Ext.panel.Panel',
         *          requires: [
         *              'My.app.PanelPart2',
         *              'My.app.PanelPart3'
         *          ]
         *
         *          constructor: function (config) {
         *              this.callParent(arguments); // calls Ext.panel.Panel's constructor
         *              //...
         *          },
         *
         *          statics: {
         *              method: function () {
         *                  return 'abc';
         *              }
         *          }
         *      });
         *
         *      // File: /src/app/PanelPart2.js
         *      Ext.define('My.app.PanelPart2', {
         *          override: 'My.app.Panel',
         *
         *          constructor: function (config) {
         *              this.callParent(arguments); // calls My.app.Panel's constructor
         *              //...
         *          }
         *      });
         *
         * Another use of overrides is to provide optional parts of cl***REMOVED***es that can be
         * independently required. In this case, the cl***REMOVED*** may even be unaware of the
         * override altogether.
         *
         *      Ext.define('My.ux.CoolTip', {
         *          override: 'Ext.tip.ToolTip',
         *
         *          constructor: function (config) {
         *              this.callParent(arguments); // calls Ext.tip.ToolTip's constructor
         *              //...
         *          }
         *      });
         *
         * The above override can now be required as normal.
         *
         *      Ext.define('My.app.App', {
         *          requires: [
         *              'My.ux.CoolTip'
         *          ]
         *      });
         *
         * Overrides can also contain statics:
         *
         *      Ext.define('My.app.BarMod', {
         *          override: 'Ext.foo.Bar',
         *
         *          statics: {
         *              method: function (x) {
         *                  return this.callParent([x * 2]); // call Ext.foo.Bar.method
         *              }
         *          }
         *      });
         *
         * IMPORTANT: An override is only included in a build if the cl***REMOVED*** it overrides is
         * required. Otherwise, the override, like the target cl***REMOVED***, is not included.
         *
         * @param {String} cl***REMOVED***Name The cl***REMOVED*** name to create in string dot-namespaced format, for example:
         * 'My.very.awesome.Cl***REMOVED***', 'FeedViewer.plugin.CoolPager'
         * It is highly recommended to follow this simple convention:
         *  - The root and the cl***REMOVED*** name are 'CamelCased'
         *  - Everything else is lower-cased
         * P***REMOVED*** `null` to create an anonymous cl***REMOVED***.
         * @param {Object} data The key - value pairs of properties to apply to this cl***REMOVED***. Property names can be of any valid
         * strings, except those in the reserved listed below:
         *  - `mixins`
         *  - `statics`
         *  - `config`
         *  - `alias`
         *  - `self`
         *  - `singleton`
         *  - `alternateCl***REMOVED***Name`
         *  - `override`
         *
         * @param {Function} createdFn Optional callback to execute after the cl***REMOVED*** is created, the execution scope of which
         * (`this`) will be the newly created cl***REMOVED*** itself.
         * @return {Ext.Base}
         * @markdown
         * @member Ext
         * @method define
         */
        define: function (cl***REMOVED***Name, data, createdFn) {
            if (data.override) {
                return Manager.createOverride.apply(Manager, arguments);
            }

            return Manager.create.apply(Manager, arguments);
        },

        /**
         * Convenient shorthand, see {@link Ext.Cl***REMOVED***Manager#getName}
         * @member Ext
         * @method getCl***REMOVED***Name
         */
        getCl***REMOVED***Name: alias(Manager, 'getName'),

        /**
         * Returns the displayName property or cl***REMOVED***Name or object. When all else fails, returns "Anonymous".
         * @param {Object} object
         * @return {String}
         */
        getDisplayName: function(object) {
            if (object) {
                if (object.displayName) {
                    return object.displayName;
                }

                if (object.$name && object.$cl***REMOVED***) {
                    return Ext.getCl***REMOVED***Name(object.$cl***REMOVED***) + '#' + object.$name;
                }

                if (object.$cl***REMOVED***Name) {
                    return object.$cl***REMOVED***Name;
                }
            }

            return 'Anonymous';
        },

        /**
         * Convenient shorthand, see {@link Ext.Cl***REMOVED***Manager#getCl***REMOVED***}
         * @member Ext
         * @method getCl***REMOVED***
         */
        getCl***REMOVED***: alias(Manager, 'getCl***REMOVED***'),

        /**
         * Creates namespaces to be used for scoping variables and cl***REMOVED***es so that they are not global.
         * Specifying the last node of a namespace implicitly creates all other nodes. Usage:
         *
         *     Ext.namespace('Company', 'Company.data');
         *
         *     // equivalent and preferable to the above syntax
         *     Ext.ns('Company.data');
         *
         *     Company.Widget = function() { ... };
         *
         *     Company.data.CustomStore = function(config) { ... };
         *
         * @param {String...} namespaces
         * @return {Object} The namespace object.
         * (If multiple arguments are p***REMOVED***ed, this will be the last namespace created)
         * @member Ext
         * @method namespace
         */
        namespace: alias(Manager, 'createNamespaces')
    });

    /**
     * Old name for {@link Ext#widget}.
     * @deprecated 4.0.0 Use {@link Ext#widget} instead.
     * @method createWidget
     * @member Ext
     */
    Ext.createWidget = Ext.widget;

    /**
     * Convenient alias for {@link Ext#namespace Ext.namespace}.
     * @inheritdoc Ext#namespace
     * @member Ext
     * @method ns
     */
    Ext.ns = Ext.namespace;

    Cl***REMOVED***.registerPreprocessor('cl***REMOVED***Name', function(cls, data) {
        if (data.$cl***REMOVED***Name) {
            cls.$cl***REMOVED***Name = data.$cl***REMOVED***Name;
            //<debug>
            cls.displayName = cls.$cl***REMOVED***Name;
            //</debug>
        }
    }, true, 'first');

    Cl***REMOVED***.registerPreprocessor('alias', function(cls, data) {
        var prototype = cls.prototype,
            xtypes = arrayFrom(data.xtype),
            aliases = arrayFrom(data.alias),
            widgetPrefix = 'widget.',
            widgetPrefixLength = widgetPrefix.length,
            xtypesChain = Array.prototype.slice.call(prototype.xtypesChain || []),
            xtypesMap = Ext.merge({}, prototype.xtypesMap || {}),
            i, ln, alias, xtype;

        for (i = 0,ln = aliases.length; i < ln; i++) {
            alias = aliases[i];

            //<debug error>
            if (typeof alias != 'string' || alias.length < 1) {
                throw new Error("[Ext.define] Invalid alias of: '" + alias + "' for cl***REMOVED***: '" + name + "'; must be a valid string");
            }
            //</debug>

            if (alias.substring(0, widgetPrefixLength) === widgetPrefix) {
                xtype = alias.substring(widgetPrefixLength);
                Ext.Array.include(xtypes, xtype);
            }
        }

        cls.xtype = data.xtype = xtypes[0];
        data.xtypes = xtypes;

        for (i = 0,ln = xtypes.length; i < ln; i++) {
            xtype = xtypes[i];

            if (!xtypesMap[xtype]) {
                xtypesMap[xtype] = true;
                xtypesChain.push(xtype);
            }
        }

        data.xtypesChain = xtypesChain;
        data.xtypesMap = xtypesMap;

        Ext.Function.interceptAfter(data, 'onCl***REMOVED***Created', function() {
            var mixins = prototype.mixins,
                key, mixin;

            for (key in mixins) {
                if (mixins.hasOwnProperty(key)) {
                    mixin = mixins[key];

                    xtypes = mixin.xtypes;

                    if (xtypes) {
                        for (i = 0,ln = xtypes.length; i < ln; i++) {
                            xtype = xtypes[i];

                            if (!xtypesMap[xtype]) {
                                xtypesMap[xtype] = true;
                                xtypesChain.push(xtype);
                            }
                        }
                    }
                }
            }
        });

        for (i = 0,ln = xtypes.length; i < ln; i++) {
            xtype = xtypes[i];

            //<debug error>
            if (typeof xtype != 'string' || xtype.length < 1) {
                throw new Error("[Ext.define] Invalid xtype of: '" + xtype + "' for cl***REMOVED***: '" + name + "'; must be a valid non-empty string");
            }
            //</debug>

            Ext.Array.include(aliases, widgetPrefix + xtype);
        }

        data.alias = aliases;

    }, ['xtype', 'alias']);

}(Ext.Cl***REMOVED***, Ext.Function.alias, Array.prototype.slice, Ext.Array.from, Ext.global));
