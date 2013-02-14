# include the utils rb file which has extra functionality for the ext theme
dir = File.dirname(__FILE__)
require File.join(dir, 'lib', 'utils.rb')

# register ext4 as a comp***REMOVED*** framework
Comp***REMOVED***::Frameworks.register 'ext4', dir