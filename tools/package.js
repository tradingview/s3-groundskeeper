const fs = require('fs');
const path = require('path');
const semver = require('semver');
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

function getPublishedVersion() {
	try {
		// Requesting published package version: npm view s3-groundskeeper version:
		const processResult = require('child_process').spawnSync('npm', ['view', PACKAGE_NAME, 'version'], { encoding: 'utf-8' });

		if (processResult.status !== 0) {
			throw new Error('npm view returns an error ');
		}

		console.log(processResult.stdout.trim());
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
		version: getPackageVersion(version),
		author: 'TradingView, Inc.',
		description: 'One way sync. local directory -> s3 bucket\'s content',
		license: 'MIT',
		keywords: ['amazon', 'aws', 's3', 's3-storage', 's3-sync'],
		repository: {
			type: 'git',
			url: 'https://github.com/tradingview/s3-groundskeeper'
		},
		main: "api/api.js",
		bin: {
			s3gk: 'cli.js'
		},
		type: 'module',
		dependencies: dependencies
	});

	const packageJson = packageMetadata(getArgs().version, JSON.parse(fs.readFileSync(path.join(getArgs().root, 'package.json'))).dependencies);
	
	fs.writeFileSync(path.join(getArgs().output, 'package.json'), JSON.stringify(packageJson, null, '\t'));
}
