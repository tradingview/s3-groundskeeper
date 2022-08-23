import * as stream from 'stream';
import * as S3 from '@aws-sdk/client-s3';
import { getArgv } from './config.js';
import { Storage, StorageOp,  StorageObject, ObjectMeta } from './storage-api';


interface S3Config {
	accessKey: string;
	secretAccessKey: string;
	region: string;
	bucket: string;
}

let s3Config: S3Config | undefined;

function getS3Config(): S3Config {
	if (!s3Config) {
		const argv = getArgv();

		s3Config = {
			accessKey: argv['s3-key'],
			secretAccessKey: argv['s3-seckey'],
			region: argv['s3-region'],
			bucket: argv['s3-bucket']
		};
	}

	return s3Config;
}

class S3Object implements StorageObject {
	private readonly client: S3.S3Client;
	private readonly bucket: string;
	private readonly obj: S3._Object;

	constructor(client: S3.S3Client, bucket: string, obj: S3._Object) {
		this.client = client;
		this.bucket = bucket;
		this.obj = obj;
	}

	get key(): string {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return this.obj.Key!;
	}

	async meta(): Promise<ObjectMeta> {
		const mt = await this.client.send(new S3.HeadObjectCommand({Bucket: this.bucket, Key: this.key}));

		// see: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
		const md5 = this.obj.ETag ? this.obj.ETag.replace(/"/g, '') : undefined;

		return {
			key: this.key,
			size: this.obj.Size ?? 0,
			md5,
			redirectPath: mt.WebsiteRedirectLocation,
			custom: mt.Metadata
		};
	}

	open(): Promise<stream.Readable> {
		throw new Error('S3Object.open does not implemented');
	}
}

export class S3Storage implements Storage {

	private readonly client: S3.S3Client;

	constructor() {
		const conf = getS3Config();
		const clientConfig: S3.S3ClientConfig = {
			region: conf.region,
			credentials: {
				accessKeyId: conf.accessKey,
				secretAccessKey: conf.secretAccessKey
			}
		};

		this.client = new S3.S3Client(clientConfig);
	}

	get bucket(): string {
		return getS3Config().bucket;
	}

	async list(): Promise<StorageObject[]> {
		const bucket = this.bucket;
		const data: S3.ListObjectsCommandOutput = await this.client.send(new S3.ListObjectsCommand({Bucket: bucket}));
		if (!data.Contents || data.Contents.length === 0) {
			return [];
		}

		const objects = data.Contents
			.filter(obj => (typeof obj.Key === 'string') && obj.Key.length > 0)
			.map((obj: S3._Object) => {
				return new S3Object(this.client, bucket, obj);
			});

		return objects;
	}

	del(key: string): StorageOp {
		const run = async (): Promise<void> => {
			const params: S3.DeleteObjectCommandInput = {
				Key: key,
				Bucket: this.bucket
			};

			await this.client.send(new S3.DeleteObjectCommand(params));
		};

		const describe = (): Promise<string> => Promise.resolve(`S3 bucket (${this.bucket}) delete object (${key})`);

		return {
			describe,
			run
		};
	}

	put(obj: StorageObject): StorageOp {
		const metaPromise = obj.meta();

		const run = async (): Promise<void> => {
			const bucket = this.bucket;
			const meta = await metaPromise;

			const params: S3.PutObjectCommandInput = {
				Key: obj.key,
				Bucket: bucket,
				Metadata: meta.custom
			};

			if (meta.contentType) {
				params.ContentType = meta.contentType;
			}

			// if (meta.md5) {
			// 	params.ContentMD5 = meta.md5;
			// }

			if (meta.redirectPath) {
				params.WebsiteRedirectLocation = meta.redirectPath;
			}
			else {
				params.ContentLength = meta.size;
				params.Body = await obj.open();
			}

			await this.client.send(new S3.PutObjectCommand(params));
		};

		const describe = async (): Promise<string> => {
			const bucket = this.bucket;
			const meta = await metaPromise;

			if (meta.redirectPath) {
				return `S3 bucket (${bucket}) put object (${obj.key}) with redirect location (${meta.redirectPath})`;
			}
			return `S3 bucket (${bucket}) put object (${obj.key}) from ${obj.description ?? 'no description' } `;
		};

		return {
			describe,
			run
		};
	}
}
