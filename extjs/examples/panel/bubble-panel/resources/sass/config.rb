# $ext_path: This should be the path of where the ExtJS SDK is installed
# Generally this will be in a lib/extjs folder in your applications root
# <root>/lib/extjs
$ext_path = "../../../../../"

# s***REMOVED***_path: the directory your S***REMOVED*** files are in. THIS file should also be in the S***REMOVED*** folder
# Generally this will be in a resources/s***REMOVED*** folder
# <root>/resources/s***REMOVED***
s***REMOVED***_path = File.dirname(__FILE__)

# css_path: the directory you want your CSS files to be.
# Generally this is a folder in the parent directory of your S***REMOVED*** files
# <root>/resources/css
css_path = File.join(s***REMOVED***_path, "..", "css")

# output_style: The output style for your compiled CSS
# nested, expanded, compact, compressed
# More information can be found here http://s***REMOVED***-lang.com/docs/yardoc/file.SASS_REFERENCE.html#output_style
output_style = :compressed

# We need to load in the Ext4 themes folder, which includes all it's default styling, images, variables and mixins
load File.join(File.dirname(__FILE__), $ext_path, 'resources', 'themes')