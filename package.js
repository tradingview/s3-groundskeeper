/*const { mode, appVersion } = require("webpack-nano/argv");
const fs = require('fs');
const path = require('path');
const { merge } = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');
const GenerateJsonPlugin = require('generate-json-webpack-plugin');

const production = {
	mode: 'production',
	watch: false
};

const development = {
	devtool: 'source-map',
	mode: 'development',
	watch: true
}

const packageMetadata = (version) => ({
	name: 's3-groundskeeper',
	version: version,
	author: 'TradingView, Inc.',
	description: 'One way sync. local directory -> s3 bucket\'s content',
	license: 'MIT',
	keywords: ['amazon', 'aws', 's3', 's3-storage', 's3-sync'],
	repository: {
		type: 'git',
		url: 'https://github.com/tradingview/s3-groundskeeper'
	},
	bin: {
		s3gk: 'index.js'
	}
});

const getConfig = (mode, appVersion) => {
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

		externals: {
			'package.json': 'commonjs2 ./package.json',
		},

		plugins: [
			new GenerateJsonPlugin('package.json', packageMetadata(appVersion), null, 2),
			new CopyPlugin({
				patterns: [
					{ from: 'LICENSE.txt', to: 'LICENSE', toType: 'file' },
					{ from: 'README.md', to: 'README.md', toType: 'file' },
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


module.exports = getConfig(mode, appVersion || '0.0.0');*/

const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers')

function cleanDirectory() {
	console.log('\x1b[32m%s\x1b[0m', 'Cleaning up dist folder...');
	fs.rmSync(path.resolve(__dirname, 'dist'), {recursive: true, force: true});
	console.log('\x1b[32m%s\x1b[0m', 'Starting build...');
}

function copyLicense() {
	fs.mkdirSync('dist');
	fs.copyFileSync('LICENSE.txt', 'dist/LICENSE');
	fs.copyFileSync('README.md', 'dist/README.md');	
}

function generatePackage() {
	const packageMetadata = (version) => ({
		name: 's3-groundskeeper',
		version: version,
		author: 'TradingView, Inc.',
		description: 'One way sync. local directory -> s3 bucket\'s content',
		license: 'MIT',
		keywords: ['amazon', 'aws', 's3', 's3-storage', 's3-sync'],
		repository: {
			type: 'git',
			url: 'https://github.com/tradingview/s3-groundskeeper'
		},
		bin: {
			s3gk: 'index.js'
		}
	});
	
    const argv = yargs(process.argv)
        .option('version', { demand: true, alias: 'v', type: 'string', default: '0.0.0', description: 'Version' })
        .argv;

	fs.writeFileSync('dist/package.json', JSON.stringify(packageMetadata(argv.version), null, '\t'));
}

cleanDirectory();
copyLicense();
generatePackage();