module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      dist: ['public/.tmp', 'public/dist/']
    },
    copy: {
      index: {
        files: [{expand: true, cwd: 'public/', src: ['index.html'], dest: 'public/dist/', filter: 'isFile'}]
      },
      html: {
        files: [{expand: true, cwd: 'public/', src: ['app/**/*.html'], dest: 'public/dist/', filter: 'isFile'}]
      },
      js: {
        files: [{expand: true, cwd: 'public/', src: ['app/**/*.js'], dest: 'public/dist/', filter: 'isFile'}]
      },
      images: {
        files: [{expand: true, cwd: 'public/', src: ['favicon.ico', 'img/**/*'], dest: 'public/dist/'},
                {expand: true, cwd: 'public/bower_components/leaflet/dist', src: ['images/**/*'], dest: 'public/dist/vendor/css'},
                {expand: true, cwd: 'public/bower_components/Leaflet.awesome-markers/dist', src: ['images/**/*'], dest: 'public/dist/vendor/css'}]
      },
      fonts: {
        files: [{expand: true, cwd: 'public/', src: ['fonts/**/*'], dest: 'public/dist/'},
                {expand: true, cwd: 'public/vendor/bootstrap/', src: ['fonts/**/*'], dest: 'public/dist/vendor'},
                {expand: true, cwd: 'public/bower_components/font-awesome/', src: ['fonts/**/*'], dest: 'public/dist/vendor'}]
      },
      apps: {
        files: [{expand: true, cwd: 'public/', src: ['mobile-apps/**/*'], dest: 'public/dist/', filter: 'isFile'}]
      }
    },
    useminPrepare: {
      html: 'public/index.html',
      options: {
        dest: 'public/dist',
        staging: 'public/.tmp',
        flow: {
          steps: {
            vendorjs: ['concat'],
            js: ['concat', 'uglifyjs'],
            css: ['concat', 'cssmin']
          },
          post: {}
        }
      }
    },
    usemin: {
      html: 'public/dist/index.html',
      options: {
        basedir: 'public/dist',
        blockReplacements: {
          vendorjs: function(block) {
            return '<script src="' + block.dest + '"></script>';
          }
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-usemin');

  grunt.registerTask('build', [
    'clean',
    'copy',
    'useminPrepare',
    'concat:generated',
    'cssmin:generated',
    'uglify:generated',
    'usemin'
  ]);
};
