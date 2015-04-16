var gulp = require('gulp'),
	tsc = require('gulp-typescript'),
    rename = require('gulp-rename'),
    less = require('gulp-less');
	
var tssrc = 'src/ts/*.ts';
var lesssrc = 'src/less/*.less';

gulp.task('compile-ts', function(){
	gulp.src(tssrc)
		.pipe(tsc())
        .pipe(rename('edge.js'))
		.pipe(gulp.dest('dist/js'));
});

gulp.task('compile-less', function(){
	gulp.src(lesssrc)
		.pipe(less())
        .pipe(rename('edge.css'))
		.pipe(gulp.dest('dist/css'));
});

gulp.task('default', function(){
	gulp.watch(tssrc, ['compile-ts']);
    gulp.watch(lesssrc, ['compile-less']);
});
