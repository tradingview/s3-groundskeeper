import { getArgv } from './config';
import { createArtifactoryClient, ArtifactoryConfig, ArtifactoryClient } from './index.js';

export { ArtifactoryConfig, ArtifactoryClient, ArtifactoryItemMeta } from './index.js';


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
