import { getArgv } from './config';
import { createArtifactoryClient, ArtifactoryConfig, ArtifactoryClient } from './api/api.js';

export { ArtifactoryConfig, ArtifactoryClient, ArtifactoryItemMeta } from './api/api.js';


let artifactoryInstance: ArtifactoryClient | undefined;

export function artifactory(): ArtifactoryClient {

	if (!artifactoryInstance) {
		const argv = getArgv();
		const artConfig: ArtifactoryConfig = {
			host: argv['artifactory-host'],
			user: argv['artifactory-user'],
			apiKey: argv['artifactory-apikey']
		};

		artifactoryInstance = createArtifactoryClient(artConfig);
	}

	return artifactoryInstance;
}
