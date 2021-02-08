import * as stream from 'stream';
import { getArgv } from './config';
import * as http from './http';

interface ArtConfig {
	host: string;
	user?: string;
	apiKey?: string;
	password?: string;
}

let artConfig: ArtConfig | undefined;


function getArtConfig(): ArtConfig {
	if (!artConfig) {
		const argv = getArgv();
		artConfig = {
			host: argv['artifactory-host'],
			user: argv['artifactory-user'],
			apiKey: argv['artifactory-apikey']
		};
	}

	return artConfig;
}

export type ItemType = 'file';

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
	resolveContentUri(item: ArtifactoryItemMeta | string): string;
}

class Artifactory implements ArtifactoryClient {

	private headers: Record<string, string> = {};

	constructor() {

		const config = getArtConfig();
		
		if (!config.user) {
			throw new Error('jfrog authentication: \'user\'must be specified.');
		}

		const makeBasicAuth = (value: string): string => {
			const encoded = Buffer.from(value).toString('base64');
			return 'Basic ' + encoded;
		};

		if (config.apiKey) {
			this.headers.Authorization = makeBasicAuth(`${config.user}:${config.apiKey}`);
		}
		else if (config.password) {
			this.headers.Authorization = makeBasicAuth(`${config.user}:${config.password}`);
		}
		else {
			throw new Error('jfrog authentication: \'apikey\' or \'password\' must be specified.');
		}
	}

	async query<T>(request: string): Promise<AqlRequestResult<T>> {

		const config = getArtConfig();
		const url = `https://${config.host}/artifactory/api/search/aql`;
		
		return http.post(url,
		{
			body: {
				content: request,
				contentType: 'text/plain'
			},
			headers: this.headers
		})
		.then((buffer: Buffer) => {
			const json = buffer.toString();
			const genericResponse: unknown = JSON.parse(json);
			return genericResponse as AqlRequestResult<T>;
		});
	}

	getContentStream(item: ArtifactoryItemMeta | string): Promise<stream.Readable> {
		const uri = this.resolveContentUri(item);
		return http.get(uri, {stream: true});
	}

	resolveContentUri(item: ArtifactoryItemMeta | string): string {
		const itemPath: string = (typeof item === 'string') ? item : (() => {
				return `${item.repo}/${item.path}/${item.name}`;
			})();

		return `https://${getArtConfig().host}/artifactory/${itemPath}`;
	}
}

let artifactoryInstance: ArtifactoryClient | undefined;

export function artifactory(): ArtifactoryClient {
	if (!artifactoryInstance) {
		artifactoryInstance = new Artifactory();
	}
	return artifactoryInstance;
}
