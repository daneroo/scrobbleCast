'use strict';

var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var babel = require('babel/register');

var paths = {
  lint: ['./gulpfile.js', 'index.js', './lib/**/*.js'],
  watch: ['./gulpfile.js', './lib/**', './test/**/*.js', '!test/{temp,temp/**}'],
  tests: ['./test/**/*.js', '!test/{temp,temp/**}'],
  source: ['./lib/*.js']
};

var plumberConf = {};

if (process.env.CI) {
  plumberConf.errorHandler = function(err) {
    throw err;
  };
}

gulp.task('lint', function() {
  return gulp.src(paths.lint)
    .pipe(plugins.plumber(plumberConf))
    .pipe(plugins.eslint('.eslintrc'))
    .pipe(plugins.eslint.format()) // use the default "stylish" eslint formatter
    .pipe(plugins.jscs());
});

gulp.task('mocha', function() {
  gulp.src(paths.tests)
    .pipe(plugins.plumber(plumberConf))
    .pipe(plugins.mocha({
      compilers: {
        js: babel
      }
    }));
});

// broken - need to use sourcemaps.... for coverage
// gulp.task('istanbul', function(cb) {
//   gulp.src(paths.source)
//     .pipe(plugins.istanbul()) // Covering files
//     .on('finish', function() {
//       gulp.src(paths.tests)
//         .pipe(plugins.plumber(plumberConf))
//         .pipe(plugins.mocha({
//           compilers: {
//             js: babel
//           }
//         }))
//         .pipe(plugins.istanbul.writeReports()) // Creating the reports after tests runned
//         .on('finish', function() {
//           process.chdir(__dirname);
//           cb();
//         });
//     });
// });

// e.g.: gulp bump --type minor
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

gulp.task('test', ['lint', 'mocha']);

gulp.task('release', ['bump']);

gulp.task('default', ['test']);
