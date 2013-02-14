/**
 * This cl***REMOVED*** provides a DOM Cl***REMOVED***List API to buffer access to an element's cl***REMOVED***.
 * Instances of this cl***REMOVED*** are created by {@link Ext.layout.ContextItem#getCl***REMOVED***List}.
 */
Ext.define('Ext.layout.Cl***REMOVED***List', (function () {

    var splitWords = Ext.String.splitWords,
        toMap = Ext.Array.toMap;

    return {
        dirty: false,

        constructor: function (owner) {
            this.owner = owner;
            this.map = toMap(this.cl***REMOVED***es = splitWords(owner.el.cl***REMOVED***Name));
        },

        /**
         * Adds a single cl***REMOVED*** to the cl***REMOVED*** list.
         */
        add: function (cls) {
            var me = this;

            if (!me.map[cls]) {
                me.map[cls] = true;
                me.cl***REMOVED***es.push(cls);
                if (!me.dirty) {
                    me.dirty = true;
                    me.owner.markDirty();
                }
            }
        },

        /**
         * Adds one or more cl***REMOVED***es in an array or space-delimited string to the cl***REMOVED*** list.
         */
        addMany: function (cl***REMOVED***es) {
            Ext.each(splitWords(cl***REMOVED***es), this.add, this);
        },

        contains: function (cls) {
            return this.map[cls];
        },

        flush: function () {
            this.owner.el.cl***REMOVED***Name = this.cl***REMOVED***es.join(' ');
            this.dirty = false;
        },

        /**
         * Removes a single cl***REMOVED*** from the cl***REMOVED*** list.
         */
        remove: function (cls) {
            var me = this;

            if (me.map[cls]) {
                delete me.map[cls];
                me.cl***REMOVED***es = Ext.Array.filter(me.cl***REMOVED***es, function (c) {
                    return c != cls;
                });
                if (!me.dirty) {
                    me.dirty = true;
                    me.owner.markDirty();
                }
            }
        },

        /**
         * Removes one or more cl***REMOVED***es in an array or space-delimited string from the cl***REMOVED***
         * list.
         */
        removeMany: function (cl***REMOVED***es) {
            var me = this,
                remove = toMap(splitWords(cl***REMOVED***es));

            me.cl***REMOVED***es = Ext.Array.filter(me.cl***REMOVED***es, function (c) {
                if (!remove[c]) {
                    return true;
                }

                delete me.map[c];
                if (!me.dirty) {
                    me.dirty = true;
                    me.owner.markDirty();
                }
                return false;
            });
        }
    };
}()));
