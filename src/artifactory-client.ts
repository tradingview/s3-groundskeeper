import * as stream from 'stream';
import * as http from './utils/http.js';

export interface ArtifactoryClientConfig {
	protocol?: string;
	host: string;
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

export interface ArtifactoryClient {
	query<T>(request: string): Promise<AqlRequestResult<T>>;
	getContentStream(item: ArtifactoryItemMeta | string): Promise<stream.Readable>;
	resolveUri(item: ArtifactoryItemMeta | string): string;
}

class Artifactory implements ArtifactoryClient {

	private readonly config: ArtifactoryClientConfig;

	constructor(config: ArtifactoryClientConfig) {
		if (!config.host) {
			throw new Error('jfrog artifactory host can not be empty.');
		}

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

	getContentStream(item: ArtifactoryItemMeta | string): Promise<stream.Readable> {
		const uri = this.resolveUri(item);
		return http.get(uri,
		{
			headers: {
				Authorization: this.authorizationString
			}
		});
	}

	resolveUri(item: ArtifactoryItemMeta | string): string {
		const baseUrl = `${this.config.protocol ?? 'https'}://${this.config.host}/artifactory/`;

		if (typeof item === 'string') {
			return `${baseUrl}${item}`;
		}

		return `${baseUrl}${item.repo}/${item.path}/${item.name}`;
	}
}

export function createArtifactoryClient(config: ArtifactoryClientConfig): ArtifactoryClient {
	return new Artifactory(config);
}
