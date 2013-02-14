/**
 * @cl***REMOVED*** Ext.fx.target.CompositeSprite

This cl***REMOVED*** represents a animation target for a {@link Ext.draw.CompositeSprite}. It allows
each {@link Ext.draw.Sprite} in the group to be animated as a whole. In general this cl***REMOVED*** will not be
created directly, the {@link Ext.draw.CompositeSprite} will be p***REMOVED***ed to the animation and
and the appropriate target will be created.

 * @markdown
 */

Ext.define('Ext.fx.target.CompositeSprite', {

    /* Begin Definitions */

    extend: 'Ext.fx.target.Sprite',

    /* End Definitions */

    getAttr: function(attr, val) {
        var out     = [],
            sprites = [].concat(this.target.items),
            length  = sprites.length,
            i,
            sprite;

        for (i = 0; i < length; i++) {
            sprite = sprites[i];
            out.push([sprite, val != undefined ? val : this.getFromPrim(sprite, attr)]);
        }

        return out;
    }
});
