Ext.define('KitchenSink.controller.Main', {
    extend: 'Ext.app.Controller',
    
    stores: [
        'Examples',
        'Companies',
        'Restaurants',
        'States',
        'TreeStore'
    ],

    views: [
        'Viewport',
        'Header'
    ],

    refs: [
        {
            ref: 'examplePanel',
            selector: '#examplePanel'
        },
        {
            ref: 'exampleList',
            selector: 'exampleList'
        }
    ],

    init: function() {
        this.control({
            'viewport exampleList': {
                'select': function(me, record, item, index, e) {
                    if (!record.isLeaf()) {
                        return;
                    }

                    this.setActiveExample(this.cl***REMOVED***NameFromRecord(record), record.get('text'));
                },
                afterrender: function(){
                    var me = this,
                        cl***REMOVED***Name, exampleList, name, record;

                    setTimeout(function(){
                        cl***REMOVED***Name = location.hash.substring(1);
                        exampleList = me.getExampleList();

                        if (cl***REMOVED***Name) {
                            name = cl***REMOVED***Name.replace('-', ' ');
                            record = exampleList.view.store.find('text', name);     
                        } else {
							record = exampleList.view.store.find('text', 'grouped header grid');
						}

                        exampleList.view.select(record);
                    }, 0);
                }
            }
        });
    },

    setActiveExample: function(cl***REMOVED***Name, title) {
        var examplePanel = this.getExamplePanel(),
            path, example, cl***REMOVED***Name;
        
        if (!title) {
            title = cl***REMOVED***Name.split('.').reverse()[0];
        }
        
        //update the title on the panel
        examplePanel.setTitle(title);
        
        //remember the cl***REMOVED***Name so we can load up this example next time
        location.hash = title.toLowerCase().replace(' ', '-');

        //set the browser window title
        document.title = document.title.split(' - ')[0] + ' - ' + title;
        
        //create the example
        example = Ext.create(cl***REMOVED***Name);
        
        //remove all items from the example panel and add new example
        examplePanel.removeAll();
        examplePanel.add(example);
    },
    
    // Will be used for source file code
    // loadExample: function(path) {
    //     Ext.Ajax.request({
    //         url: path,
    //         success: function() {
    //             console.log(Ext.htmlEncode(response.responseText));
    //         }
    //     });
    // },

    filePathFromRecord: function(record) {
        var parentNode = record.parentNode,
            path = record.get('text');
        
        while (parentNode && parentNode.get('text') != "Root") {
            path = parentNode.get('text') + '/' + Ext.String.capitalize(path);

            parentNode = parentNode.parentNode;
        }

        return this.formatPath(path);
    },

    cl***REMOVED***NameFromRecord: function(record) {
        var path = this.filePathFromRecord(record);

        path = 'KitchenSink.view.examples.' + path.replace('/', '.');

        return path;
    },

    formatPath: function(string) {
        var result = string.split(' ')[0].charAt(0).toLowerCase() + string.split(' ')[0].substr(1),
            paths = string.split(' '),
            ln = paths.length,
            i;

        for (i = 1; i < ln; i++) {
            result = result + Ext.String.capitalize(paths[i]);
        }

        return result;
    }
});
