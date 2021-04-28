const fs = require('fs');
const path = require('path');
import resolve from '@rollup/plugin-node-resolve';
import inject from '@rollup/plugin-inject';
import babel from '@rollup/plugin-babel';
const commonjs = require('@rollup/plugin-commonjs');
const {terser} = require("rollup-plugin-terser");

const name = 'clippy'
const dist = path.resolve(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(dist)) {
	fs.mkdirSync(dist);
}

module.exports = {
	input: path.resolve(__dirname, 'lib/index.js'),
	output: [
		{
			format: 'umd',
			name: name,
			file: path.resolve(dist, name + '.umd.js'),
			sourcemap: true
		},
		{
			format: 'es',
			name: name,
			file: path.resolve(dist, name + '.esm.js'),
			sourcemap: true
		},
		{
			format: 'iife',
			name: name,
			file: path.resolve(dist, name + '.js'),
			sourcemap: true
		},
		{
			format: 'iife',
			name: name,
			file: path.resolve(dist, name + '.min.js'),
			plugins: [terser()],
			sourcemap: true
		}
	],
	plugins: [
		inject({
			cjq: [ 'jquery', 'jquery' ]
		}),
		resolve({
			browser: true,
		}),
		commonjs(),
		babel({
			babelHelpers: "bundled",
			presets: [
				[
					'@babel/preset-env',
					{
						"targets": "> 0.25%, not dead"
					}
				]
			]
		})
	]
};
