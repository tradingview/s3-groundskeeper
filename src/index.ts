import { exit } from 'process';
import { S3Storage } from './s3-storage';
import { FsStorage } from './fs-storage';
import { setupArgv, getArgv } from './config';
import { syncStorage } from './storage-sync';
import * as diag from './diag';

async function main(): Promise<number | undefined> {

	const argv = getArgv();

	const sourceStorage = new FsStorage(argv.src);
	const targetStorage = new S3Storage();
	
	await syncStorage(sourceStorage, targetStorage, argv['dry-run']);
	return 0;
}


process.on('unhandledRejection', () => {
	// console.debug('Unhandled promise rejection:');
	// console.debug(diag.messageOfError(error));
});

setupArgv();

main()
	.then(code => {
			if (typeof code === 'number' && code  !== 0) {
				exit(code);
			}
	})
	.catch((error: unknown) => {
		console.error('Error:');
		console.error(diag.messageOfError(error));
		exit(-1);
	});
