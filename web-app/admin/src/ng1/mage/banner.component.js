class BannerController {
  constructor($element, Settings) {
    this.$element = $element;
    this.Settings = Settings;
  }

  $onInit() {
    this.Settings.get({type: 'banner'}, banner => {
      this.banner = banner.settings || {};
  
      if (this.type === 'header' && this.banner.showHeader) {
        if (this.banner.headerBackgroundColor) {
          this.$element.css('background-color', this.banner.headerBackgroundColor);
        }
  
        if (this.banner.headerTextColor) {
          this.$element.css('color', this.banner.headerTextColor);
        }
      }
  
      if (this.type === 'footer' && this.banner.showFooter) {
        if (this.banner.footerBackgroundColor) {
          this.$element.css('background-color', this.banner.footerBackgroundColor);
        }
  
        if (this.banner.footerTextColor) {
          this.$element.css('color', this.banner.footerTextColor);
        }
      }
    });
  }
}

BannerController.$inject = ['$element', 'Settings'];

export default {
  template: require('./banner.html'),
  controller: BannerController,
  bindings: {
    type: '@'
  }
};