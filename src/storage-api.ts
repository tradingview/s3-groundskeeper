import * as stream from 'stream';

export interface ObjectMeta {
	readonly key: string;
	readonly size: number;
	readonly contentType?: string;
	readonly md5?: string;
	readonly redirectPath?: string;
	readonly custom?: Record<string, string>;
}

export interface StorageObject {
	readonly key: string;
	readonly description?: string;

	meta(): Promise<ObjectMeta>;
	open(): Promise<stream.Readable>;
}

export interface StorageOp {
	describe(): Promise<string>;
	run(): Promise<void>;
}

export interface ReadonlyStorage {
	list(): Promise<StorageObject[]>;
}

export interface Storage extends ReadonlyStorage {
	del(key: string): StorageOp;
	put(obj: StorageObject): StorageOp;
}
