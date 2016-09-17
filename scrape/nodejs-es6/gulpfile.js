'use strict';

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

var paths = {
  lint: ['./gulpfile.js', '*.js', './lib/**/*.js'],
  watch: ['./gulpfile.js', './lib/**', './test/**/*.js', '!test/{temp,temp/**}'],
  tests: ['./test/**/*.js', '!test/{temp,temp/**}'],
  source: ['*.js', './lib/**/*.js']
};

gulp.task('build', () =>
    gulp.src(paths.source,{base: '.'})
        .pipe(plugins.babel())
        .pipe(gulp.dest('dist'))
);

gulp.task('lint', function () {
  return gulp.src(paths.lint)
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    // To have the process exit with an error code (1) on
    // lint error, return the stream and pipe to failAfterError last.
    .pipe(plugins.eslint.failAfterError());
});

gulp.task('mocha', function() {
  gulp.src(paths.tests)
    .pipe(plugins.mocha({
      // compilers: {
      //   js: babel
      // }
    }));
});

// includes mocha's definitions
gulp.task('istanbul', function(cb) {
  gulp.src(paths.source)
    .pipe(plugins.istanbul()) // Covering files
    .on('finish', function() {
      gulp.src(paths.tests)
        .pipe(plugins.mocha())
        .pipe(plugins.istanbul.writeReports()) // Creating the reports after tests runned
        .on('finish', function() {
          process.chdir(__dirname);
          cb();
        });
    });
});

gulp.task('bump', ['test'], function() {
  var bumpType = plugins.util.env.type || 'patch'; // major.minor.patch

  return gulp.src(['./package.json'])
    .pipe(plugins.bump({
      type: bumpType
    }))
    .pipe(gulp.dest('./'));
});

gulp.task('watch', ['test'], function() {
  gulp.watch(paths.watch, ['test']);
});

// gulp.task('test', ['lint', 'istanbul']);
gulp.task('test', ['lint', 'mocha']);

gulp.task('release', ['bump']);

gulp.task('default', ['test']);
