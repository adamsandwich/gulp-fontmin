/**
 * @file gulp fontmin test
 * @author adamsandwich
 */

/* eslint-env node */

'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Vinyl = require('vinyl');
const fontmin = require('./');

function isExt(file, ext) {
    return ext.split(',').indexOf(path.extname(file.path).substr(1)) > -1;
}

it('should minify ttf, css should have path', function (cb) {
    this.timeout(40000);
    let stream = fontmin({
        text: 'hello world',
        fontPath: 'path/foo'
    });
    stream.on('data', function (file) {
        if (isExt(file, 'ttf')) {
            assert(file.contents.length < fs.statSync('Cascadia.ttf').size);
        }
        if (isExt(file, 'css')) {
            assert(
                /path\/foo/.test(
                    file.contents.toString('utf-8')
                )
            );
        }
        fs.writeFileSync(
            file.path.replace('Cascadia', 'output/Cascadia'),
            file.contents,
            {
                encoding: isExt(file, 'svg,css') ? 'utf-8' : 'binary'
            }
        );
    });
    stream.on('end', cb);
    stream.write(new Vinyl({
        path: path.join(__dirname, '/Cascadia.ttf'),
        contents: fs.readFileSync('Cascadia.ttf')
    }));
    stream.end();
});
it('should skip unsupported fonts', function (cb) {
    let stream = fontmin();
    stream.once('data', function (file) {
        assert.strictEqual(file.contents, null);
    });
    stream.on('end', cb);
    stream.write(new Vinyl({
        path: path.join(__dirname, '/Cascadia.bmp')
    }));
    stream.end();
});

