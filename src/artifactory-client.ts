import * as http from './utils/http.js';
import type { IncomingMessage } from 'http';

export interface ArtifactoryClientConfig {
	baseUrl: URL;
	user?: string;
	apiKey?: string;
	password?: string;
}

type ItemType = 'file';

export interface ArtifactoryItemMeta {
	repo: string;
	path: string;
	name: string;
	type: ItemType;
	size: number;
	// eslint-disable-next-line camelcase
	actual_md5: string;
}

export interface AqlRequestResult<T> {
	results: T[];
	range: {
		// eslint-disable-next-line camelcase
		start_pos: number;
		// eslint-disable-next-line camelcase
		end_pos: number;
		total: number;
	};
}

export interface ByteRange {
	start: number;
	end: number;
}

export interface ArtifactoryClient {
	query<T>(request: string): Promise<AqlRequestResult<T>>;
	getContentStream(item: ArtifactoryItemMeta | string, byteRange?: ByteRange): Promise<IncomingMessage>;
	resolveUri(item: ArtifactoryItemMeta | string): URL;
}

class Artifactory implements ArtifactoryClient {
	private readonly config: ArtifactoryClientConfig;

	constructor(config: ArtifactoryClientConfig) {
		this.config = config;
	}

	private get authorizationString(): string {
		if (!this.config.user) {
			throw new Error('jfrog authentication: \'user\'must be specified.');
		}

		const makeBasicAuth = (value: string): string => {
			const encoded = Buffer.from(value).toString('base64');
			return 'Basic ' + encoded;
		};


		if (this.config.apiKey) {
			return makeBasicAuth(`${this.config.user}:${this.config.apiKey}`);
		}
		else if (this.config.password) {
			return makeBasicAuth(`${this.config.user}:${this.config.password}`);
		}
		
		throw new Error('jfrog authentication: \'apikey\' or \'password\' must be specified.');
	}


	async query<T>(request: string): Promise<AqlRequestResult<T>> {

		const url = this.resolveUri('api/search/aql');

		return http.post(url,
		{
			body: {
				content: request,
				contentType: 'text/plain'
			},
			headers: {
				Authorization: this.authorizationString
			}
		})
		.then((buffer: Buffer) => {
			const json = buffer.toString();
			const genericResponse: unknown = JSON.parse(json);
			return genericResponse as AqlRequestResult<T>;
		});
	}

	getContentStream(item: ArtifactoryItemMeta | string, byteRange?: ByteRange): Promise<IncomingMessage> {
		const uri = this.resolveUri(item);

		const reqData: http.RequestData = {
			headers: {
				Authorization: this.authorizationString
			}
		};

		if (byteRange && reqData.headers) {
			reqData.headers.Range = `bytes=${byteRange.start}-${byteRange.end}`;
		}

		return http.get(uri, reqData);
	}

	resolveUri(item: ArtifactoryItemMeta | string): URL {
		if (typeof item !== 'string') {
			return new URL(`${item.repo}/${item.path}/${item.name}`, this.config.baseUrl);
		}
	
		if (item.indexOf(this.config.baseUrl.toString()) === 0) {
			return new URL(item);
		}
		
		return new URL(item, this.config.baseUrl);
	}
}

export function createArtifactoryClient(config: ArtifactoryClientConfig): ArtifactoryClient {
	return new Artifactory(config);
}
