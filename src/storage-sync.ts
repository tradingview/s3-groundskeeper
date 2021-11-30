import { ObjectMeta, ReadonlyStorage, Storage, StorageOp } from './storage-api.js';

// different object equality strategies require different equality predicates
type ObjectMetaEqualityPredicate = (a: ObjectMeta, b: ObjectMeta) => boolean;

function equalObjectMetaKey(meta1: ObjectMeta, meta2: ObjectMeta): boolean {
	return meta1.key === meta2.key;
}

function equalObjectMeta(meta1: ObjectMeta, meta2: ObjectMeta): boolean {
	if (meta1.key !== meta2.key) {
		return false;
	}

	if (meta1.size !== meta2.size) {
		return false;
	}
	
	const fstMd5 = meta1.md5 ?? '';
	const sndMd5 = meta2.md5 ?? '';
	return fstMd5 === sndMd5;
}


function diff(left: ObjectMeta[], right: ObjectMeta[], equal: ObjectMetaEqualityPredicate): ObjectMeta[] {
	return left.filter(x => right.findIndex(y => equal(x, y)) < 0);
}

export async function syncStorage(source: ReadonlyStorage, target: Storage, dryRun: boolean): Promise<void> {

	const [sourceObjects, targetObjects] = await Promise.all([source.list(), target.list()]);
	const operations: StorageOp[] = [];

	const sourceObjectsMeta = await Promise.all(sourceObjects.map(o => o.meta()));
	const targetObjectsMeta = await Promise.all(targetObjects.map(o => o.meta()));

	// take objects that exist within target storage (S3), but not in source storage (filesystem): deletion list
	for (const meta of diff(targetObjectsMeta, sourceObjectsMeta, equalObjectMetaKey)) {
		operations.push(target.del(meta.key));
	}

	// take objects that exist within source storage (filesystem), but not in target storage (filesystem)
	for (const meta of diff(sourceObjectsMeta, targetObjectsMeta, equalObjectMeta)) {
		const obj = sourceObjects.find(o => o.key === meta.key);
		if (!obj) {
			throw new Error(`Object with key [${meta.key}] does not exists`);
		}
		operations.push(target.put(obj));
	}

	for (const op of operations) {
		console.debug(await op.describe());
		if (!dryRun) {
			await op.run();
		}
	}
}
