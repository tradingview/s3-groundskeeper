const { mode, appVersion } = require("webpack-nano/argv");
const fs = require('fs');
const path = require('path');
const { merge } = require('webpack-merge');

const production = {
	mode: 'production',
	watch: false
};

const development = {
	devtool: 'source-map',
	mode: 'development',
	watch: true
}


const getConfig = (mode) => {
	const config = {
		devtool: 'source-map',
		mode: 'development',
		watch: true,

		entry: './src/index.ts',
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: 'index.js',
			devtoolModuleFilenameTemplate: (info) => {
				const context = path.resolve('./dist');
				return path.relative(context, info.absoluteResourcePath);
			}
		},
		target: 'node',
		module: {
			rules: [
				{
					test: /\.ts$/,
					exclude: /node_modules/,
					use: 'ts-loader'
				},
				{
					test: /\.js$/,
					resolve: {
						fullySpecified: false
					}
				}
			]
		},
		resolve: {
			extensions: [ '.ts', '.js', '.mjs' ]
		},

		plugins: [
			// new GenerateJsonPlugin('package.json', packageMetadata(appVersion), null, 2)
		]
	}

	if (mode === 'production') {
		return merge(config, production);
	}
	else if (mode === 'development') {
		return merge(config, development);
	}

	throw new Error(`Trying to use an unknown mode, ${mode}`);
}

console.log('\x1b[32m%s\x1b[0m', 'Cleaning up dist folder...');
fs.rmdirSync(path.resolve(__dirname, 'dist'), {recursive: true});
console.log('\x1b[32m%s\x1b[0m', 'Starting build...');

module.exports = getConfig(mode);