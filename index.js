/**
 * @file gulp fontmin
 * @author adamsandwich
 */

/* eslint-env node */

'use strict';
const path = require('path');
const log = require('fancy-log');
const PluginError = require('plugin-error');
const through = require('through2-concurrent');
const assign = require('object-assign');
const prettyBytes = require('pretty-bytes');
const chalk = require('chalk');
const Fontmin = require('fontmin');

/**
 * rename
 *
 * @param  {Object} opts opts
 * @return {stream.Transform} rename transform
 */
function rename(opts) {
    opts = opts || {};
    return through.obj(function (file, enc, cb) {
        file.path = opts.path;
        cb(null, file);
    });
}

/**
 * fontmin transform
 *
 * @param  {Object} opts opts
 * @return {stream.Transform} fontmin transform
 */
module.exports = function (opts) {
    opts = assign({
        // TODO: remove this when gulp get's a real logger with levels
        verbose: process.argv.indexOf('--verbose') !== -1
    }, opts);
    let totalFiles = 0;
    let validExts = ['.ttf'];
    function printMsg(originalFile, optimizedFile, verbose) {
        const originalSize = originalFile.contents.length;
        const optimizedSize = optimizedFile.contents.length;
        const saved = originalSize - optimizedSize;
        const percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
        const savedMsg = 'saved ' + prettyBytes(saved) + ' - ' + percent.toFixed(1).replace(/\.0$/, '') + '%';
        const msg = saved > 0 ? savedMsg : 'already optimized';
        const optimizedType = (path.extname(optimizedFile.path) || path.extname(originalFile.path)).toLowerCase();
        if (verbose) {
            msg = chalk.green('✔ ') + originalFile.relative + ' -> ' + optimizedType + chalk.gray(' (' + msg + ')');
            log('gulp-fontmin:', msg);
        }
    }

    return through.obj(function (file, enc, cb) {
        if (file.isNull()) {
            cb(null, file);
            return;
        }
        if (file.isStream()) {
            cb(new PluginError('gulp-fontmin', 'Streaming not supported'));
            return;
        }
        if (validExts.indexOf(path.extname(file.path).toLowerCase()) === -1) {
            if (opts.verbose) {
                log('gulp-fontmin: Skipping unsupported font ' + chalk.blue(file.relative));
            }
            cb(null, file);
            return;
        }
        let text = opts.text || '';
        if (text && opts.chineseOnly) {
            text = text.replace(/[^\u4e00-\u9fa5]/g, '');
        }
        opts.text = text;
        let fontmin = new Fontmin()
            .src(file.contents)
            .use(rename({
                path: file.path
            }))
            .use(Fontmin.glyph(opts))
            .use(Fontmin.ttf2eot())
            .use(Fontmin.ttf2woff())
            .use(Fontmin.ttf2woff2())
            .use(Fontmin.ttf2svg())
            .use(Fontmin.css(opts));
        if (opts.use) {
            opts.use.forEach(fontmin.use.bind(fontmin));
        }
        let fileStream = this;
        fontmin.run(function (err, files) {
            if (err) {
                cb(new PluginError('gulp-fontmin:', err, {fileName: file.path}));
                return;
            }
            let gulpFile;
            files.forEach(function (optimizedFile, index) {
                if (index === 0) { // ttf
                    file.contents = optimizedFile.contents;
                }
                else { // other
                    gulpFile = file.clone();
                    gulpFile.path = gulpFile.path.replace(/.ttf$/, path.extname(optimizedFile.path));
                    gulpFile.contents = optimizedFile.contents;
                    fileStream.push(gulpFile);
                }
                printMsg(file, optimizedFile, opts.verbose);
            });
            totalFiles++;
            cb(null, file);
        });
    }, function (cb) {
        if(opts.quiet) {
            cb();
        }
        let msg = 'Minified ' + totalFiles + ' ';
        msg += totalFiles === 1 ? 'font' : 'fonts';
        log('gulp-fontmin:', msg);
        cb();
    });
};
