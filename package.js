const fs = require('fs');
const { exit } = require('process');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

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

function copyLicense() {
	if (!fs.existsSync('dist')) {
		fs.mkdirSync('dist');
	}

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
		},
		type: 'module',
		dependencies: {}
	});
	
    const argv = yargs(hideBin(process.argv))
		.version(false)
        .option('version', { demand: true, alias: 'v', type: 'string', default: '0.0.0', description: 'Version' })
        .argv;

	let packageJson = packageMetadata(argv.version);
	packageJson.dependencies = JSON.parse(fs.readFileSync('package.json')).dependencies;

	fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, '\t'));
}