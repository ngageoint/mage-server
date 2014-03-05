PATH := ../node_modules/.bin:$(PATH)

FA_ROOT_DIRECTORY = ***REMOVED***ets/font-awesome
FA_LESS_DIRECTORY = ***REMOVED***ets/font-awesome/less
FA_CSS_DIRECTORY = ***REMOVED***ets/font-awesome/css

FA_LESS_MODERN = ${FA_LESS_DIRECTORY}/font-awesome.less
FA_LESS_IE7 = ${FA_LESS_DIRECTORY}/font-awesome-ie7.less

FA_CSS_MODERN = ${FA_CSS_DIRECTORY}/font-awesome.css
FA_CSS_MODERN_MIN = ${FA_CSS_DIRECTORY}/font-awesome.min.css
FA_CSS_IE7 = ${FA_CSS_DIRECTORY}/font-awesome-ie7.css
FA_CSS_IE7_MIN = ${FA_CSS_DIRECTORY}/font-awesome-ie7.min.css

SITE_LESS_DIRECTORY = ***REMOVED***ets/less
SITE_CSS_DIRECTORY = ***REMOVED***ets/css

SITE_LESS = ${SITE_LESS_DIRECTORY}/site.less
SITE_CSS_MIN = ${SITE_CSS_DIRECTORY}/site.css

build:
	@echo "Compiling Less files"
	@mkdir -p ${FA_CSS_DIRECTORY}
	lessc ${FA_LESS_MODERN} > ${FA_CSS_MODERN}
	lessc --compress ${FA_LESS_MODERN} > ${FA_CSS_MODERN_MIN}
	lessc ${FA_LESS_IE7} > ${FA_CSS_IE7}
	lessc --compress ${FA_LESS_IE7} > ${FA_CSS_IE7_MIN}
	lessc --compress ${SITE_LESS} > ${SITE_CSS_MIN}
	cp -r ${FA_ROOT_DIRECTORY}/* ../
	cd ***REMOVED***ets && zip -r9 font-awesome.zip font-awesome


default: build


.PHONY: build
