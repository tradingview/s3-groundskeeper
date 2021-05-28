const webpack = require('webpack');
const semver = require('semver');
const { mode, appVersion } = require("webpack-nano/argv");
const fs = require('fs');
const path = require('path');
const { merge } = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');

const PACKAGE_NAME = 's3-groundskeeper';

const production = {
	mode: 'production',
	watch: false
};

const development = {
	devtool: 'source-map',
	mode: 'development',
	watch: true
}


function getPublishedVersion() {
	try {
		// Requesting published package version: npm view s3-groundskeeper version:
		const processResult = require('child_process').spawnSync('npm', ['view', PACKAGE_NAME, 'version'], { encoding: 'utf-8' });
		if (processResult.stderr && processResult.stderr.length > 0) {
			throw new Error('npm view returns an error ');
		}
		
		return semver.parse(processResult.stdout.trim());
	}
	catch {
		console.log('Fail to detect published version');
	}

	return null;
}

function getPackageVersion(version) {
	const latestVersion = getPublishedVersion();
	if (!latestVersion) {
		return version;
	}

	const targetVersion = semver.parse(version);
	if (!targetVersion) {
		throw new Error(`Fail to parse version (${version})`);
	}

	if (targetVersion > latestVersion) {
		console.log(`Package version (${targetVersion}), latest published (${latestVersion.toString()})`);
		return version;
	}

	const newVersion = `${latestVersion.major}.${latestVersion.minor}.${latestVersion.patch + 1}`;
	console.log(`Package version (${latestVersion.toString()}) -> (${newVersion})`);
	return newVersion;
}


const packageMetadata = (version) => ({
	name: PACKAGE_NAME,
	version: getPackageVersion(version),
	author: 'TradingView, Inc.',
	description: 'One way sync. local directory -> s3 bucket\'s content',
	license: 'MIT',
	keywords: ['amazon', 'aws', 's3', 's3-storage', 's3-sync'],
	repository: {
		type: 'git',
		url: 'https://github.com/tradingview/s3-groundskeeper'
	},
	main: 'api.js',
	bin: {
		s3gk: 'cli.js'
	}
});

const getConfig = (mode, appVersion) => {
	const config = {
		devtool: 'source-map',
		mode: 'development',
		watch: true,

		entry: {
			cli: {
				import: './src/cli.ts',
				filename: '[name].js'
			},
			api: {
				import: './src/api/index.ts',
				filename: '[name].js',
				library: {
					type: 'commonjs'
				}
			}
		},
		output: {
			path: path.resolve(__dirname, 'dist'),

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

		externals: {
			'package.json': 'commonjs2 ./package.json',
		},

		plugins: [
			new webpack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true, include: 'cli'}),
			new GenerateJsonPlugin('package.json', packageMetadata(appVersion), null, 2),
			new CopyPlugin({
				patterns: [
					{ from: 'LICENSE.txt', to: 'LICENSE', toType: 'file' },
					{ from: 'README.md', to: 'README.md', toType: 'file' },
					{ from: 'api.d.ts', to: 'api.d.ts', toType: 'file' },
				]
			}),
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

module.exports = getConfig(mode, appVersion || '0.0.0');