import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as crypto from 'crypto';
import { ReadonlyStorage, StorageObject, ObjectMeta } from './storage-api.js';
import { findMetaForPath, getArgv } from './config.js';

import { ArtifactoryClient, ArtifactoryConfig, ArtifactoryItemMeta, createArtifactoryClient, MetaPointer, readMetaPointerFromFile } from './index.js';


function computeFileMd5(fullPath: string): Promise<string> {
	return fs.promises
		.readFile(fullPath)
		.then((content: Buffer): string => {
			const hasher = crypto.createHash('md5');
			const md5Str = hasher.update(content).digest('hex');
			return md5Str;
		});
}

class FsObjectBase {
	readonly rootPath: string;
	readonly relPath: string;
	readonly key: string;

	constructor(rootPath: string, relPath: string) {
		this.rootPath = rootPath;
		this.relPath = relPath;
		this.key = this.relPath.replace(/\\/gi, '/');
	}

	get contentType(): string {
		return findMetaForPath(this.fullPath)?.contentType ?? 'application/octet-stream';
	}


	get fullPath(): string {
		return path.resolve(this.rootPath, this.relPath);
	}
}

class FsObject extends FsObjectBase implements StorageObject {

	private readonly stats: fs.Stats;

	constructor(rootPath: string, relPath: string, stats: fs.Stats) {
		super(rootPath, relPath);
		this.stats = stats;
	}

	get description(): string {
		return `${this.fullPath}, (${this.contentType})`;
	}

	async meta(): Promise<ObjectMeta> {
		if (!this.stats.isSymbolicLink()) {
			const md5 = await computeFileMd5(this.fullPath);

			return {
				key: this.key,
				md5,
				size: this.stats.size,
				contentType: this.contentType
			};
		}

		const resolvedLink = await fs.promises.readlink(this.fullPath);
		let redirectPath = path
			.relative(this.rootPath, resolvedLink)
			.replace(/\\/gi, '/');
		
		if (!redirectPath.startsWith('/')) {
			redirectPath = `/${redirectPath}`;
		}

		return {
			key: this.key,
			size: 0,
			contentType: this.contentType,
			redirectPath
		};
	}

	open(): Promise<stream.Readable> {
		return Promise.resolve(fs.createReadStream(this.fullPath));
	}
}

class MetaPointerFsObject extends FsObjectBase implements StorageObject {
	private readonly metaptr: MetaPointer;
	private readonly artItem: Promise<ArtifactoryItemMeta | null>;
	private readonly artifactoryClient: ArtifactoryClient;
	private url: URL | undefined;

	constructor(rootPath: string, relPath: string, metaptr: MetaPointer) {
		super(rootPath, relPath);
		this.metaptr = metaptr;

		const aqlItemField = this.metaptr.oid.kind === 'md5' ? 'actual_md5' : this.metaptr.oid.kind;
		const aql = `
			items
				.find( { "${aqlItemField}" : "${this.metaptr.oid.value}" } )
				.include("*")
				`;

		const argv = getArgv();
		if (argv['artifactory-url'].length === 0) {
			throw new Error('artifactory-url can not be empty.');
		}
		const artConfig: ArtifactoryConfig = {
			baseUrl: new URL(argv['artifactory-url']),
			user: argv['artifactory-user'],
			password: argv['artifactory-password'],
			apiKey: argv['artifactory-apikey']
		};

		this.artifactoryClient = createArtifactoryClient(artConfig);

		this.artItem = this.artifactoryClient
			.query<ArtifactoryItemMeta>(aql)
			.then(response => {
				if (response.results.length === 0) {
					throw new Error(`Artifactory item [${aqlItemField}]:(${metaptr.oid.value}) not found`);
				}
				else if (response.results.length > 1) {
					throw new Error(`Artifactory aql [${aqlItemField}]:(${metaptr.oid.value}) found multiply results`);
				}
				
				const item = response.results[0];
				if (!item) {
					throw new Error(`item not found: ${metaptr.oid.value}`);
				}
				this.url = this.artifactoryClient.getItemUrl(item);
				return item;
			});

	}

	get description(): string {
		const name =  this.url ? this.url.toString() : `resolve artifactory item (${this.metaptr.oid.value})`;
		return `${name}, (${this.contentType})`;
	}

	meta(): Promise<ObjectMeta> {
		return this.resolveArtItem()
			.then(item => {
				return {
					key: this.key,
					size: item.size,
					md5: item.actual_md5,
					contentType: this.contentType
				};
			});
	}

	async open(): Promise<stream.Readable> {
		const item = await this.resolveArtItem();
		const contentStream = await this.artifactoryClient.getContentStream(item);
		return contentStream;
	}

	private async resolveArtItem(): Promise<ArtifactoryItemMeta> {
		const item = await this.artItem;
		if (!item) {
			throw new Error(`artifactory item:(${this.metaptr.oid.kind}:${this.metaptr.oid.value}) not found`);
		}
		return item;
	}
}

export class FsStorage implements ReadonlyStorage {

	private readonly rootPath: string;

	constructor(rootPath: string) {
		if (!fs.existsSync(rootPath)) {
			throw new Error(`Path does not exists: ${rootPath}`);
		}
		this.rootPath = rootPath;
	}

	list(): Promise<StorageObject[]> {

		const iterateDirectory = async (dirPath: string): Promise<StorageObject[]> => {

			const lst: string[] = await fs.promises.readdir(dirPath);
			if (lst.length === 0) {
				return [];
			}

			const objects: StorageObject[] = [];
			const subworks: Array<Promise<StorageObject[]>> = [];

			for (const name of lst) {
				const fullPath = path.resolve(dirPath, name);
				const key = path.relative(this.rootPath, fullPath);
				const stats = await fs.promises.lstat(fullPath);
				
				if (stats.isDirectory()) {
					subworks.push(iterateDirectory(fullPath));
				}
				else if (stats.isSymbolicLink() || stats.isFile()) {
					const metaptr = stats.isSymbolicLink() ? undefined : await readMetaPointerFromFile(fullPath, stats);
					const obj = metaptr ? new MetaPointerFsObject(this.rootPath, key, metaptr) : new FsObject(this.rootPath, key, stats);
					objects.push(obj);
				}
			}

			return objects.concat( ... await Promise.all(subworks));
		};

		return iterateDirectory(this.rootPath);
	}
}
