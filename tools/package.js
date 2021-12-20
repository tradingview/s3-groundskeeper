const fs = require('fs');
const path = require('path');
const { exit } = require('process');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const PACKAGE_NAME = 's3-groundskeeper';

function main() {
	try {
		copyLicense();
		generatePackage();
		console.log('Successful compiled.');
	}
	catch(err) {
		console.error('FAIL:');
		console.error(err);
		exit(1);
	}
}

main();

function getArgs() {
	const argv = yargs(hideBin(process.argv))
		.version(false)
		.option('version', { demand: true, alias: 'v', type: 'string', default: '0.0.0', description: 'Version' })
		.option('output', { demand: false, alias: 'o', default: 'dist', description: 'Output directory' })
		.option('root', { demand: false, alias: 'r', default: '.', description: 'Root directory' })
		.argv;

	return argv;
}

function copyLicense() {
	if (!fs.existsSync(getArgs().output)) {
		fs.mkdirSync(getArgs().output);
	}

	fs.copyFileSync(path.join(getArgs().root, 'LICENSE.txt'), path.join(getArgs().output, 'LICENSE'));
	fs.copyFileSync(path.join(getArgs().root, 'README.md'), path.join(getArgs().output, 'README.md'));	
}

function generatePackage() {
	const packageMetadata = (version, dependencies) => ({
		name: PACKAGE_NAME,
		version: version,
		author: 'TradingView, Inc.',
		description: 'One way sync. local directory -> s3 bucket\'s content',
		license: 'MIT',
		keywords: ['amazon', 'aws', 's3', 's3-storage', 's3-sync'],
		repository: {
			type: 'git',
			url: 'https://github.com/tradingview/s3-groundskeeper'
		},
		main: 'index.js',
		bin: {
			s3gk: 'cli.js'
		},
		type: 'module',
		dependencies: dependencies
	});

	const packageJson = packageMetadata(getArgs().version, JSON.parse(fs.readFileSync(path.join(getArgs().root, 'package.json'))).dependencies);
	
	fs.writeFileSync(path.join(getArgs().output, 'package.json'), JSON.stringify(packageJson, null, '\t'));
}
