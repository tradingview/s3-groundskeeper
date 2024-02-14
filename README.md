# S3 Grounds Keeper

One way synchronization local directory content with Amazon S3 bucket.



## Setup, develop, build
### npm
setup: `npm i`
start develop: `npm run build`

### yarn
setup `yarn`
start develop: `yarn build`


## CLI

|--arg                          |-short    | required | description              |
|-------------------------------|----------|----------|--------------------------|
|--src=path                     | -s=path  |*         | path to source (sync out) directory |
|--s3-region=name               |          |*         | S3 Bucket's region       |
|--s3-endpoint=url              |          |          | S3 Endpoint URL          |
|--s3-key=key                   |          |*         | S3 Access Key            |
|--s3-seckey=key                |          |*         | S3 Secret Access Key            |
|--s3-bucket=name               | -b=name  |*         | S3 destination (sync in) bucket name (**NOT ARN**, just a name)   |
|--artifactory-url=url          |          |*         | jfrog Artifactory base url |
|--artifactory-user=username    |          |*         | jfrog Artifactory user |
|--artifactory-password=password|          |          | jfrog Artifactory user's password |
|--artifactory-apikey=jfapikey  |          |          | jfrog Artifactory user's Api key |
|--dry-run                      | -n       |          | Dry run: do nothing only prints what to do. |
|--show-conf                    |          |          | Print json object for the used configuration. |

### jFrog notes

Currently supported [Basic authentication using your username and API Key](https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API#ArtifactoryRESTAPI-Authentication): user name and Api key must be provided. Each request will use **Authorization** (http header) = base64('Basic jfuser:jfapikey'). Instead of api key password also can be used.

### S3 notes

Access to s3 bucket provided through **AWS SDK/Client S3 Api**.
There is required parameters to configure access to S3 resources:
* region;
* access key / secret access key;
* target bucket's name;


## Metapointer file format.

> **#metapointer** *PROVIDERNAME*
> **oid** *provider_secific_data*

Providers:

|Provider   |Data                                      | Sample                                 |
|-----------|------------------------------------------|----------------------------------------|
|jfrogart   | **oid** aql_request_field:field_value    |oid md5:e26a6019c8da5d9a3e6f742c0c6cc02c|

Sample for jfrogart

> **#metapointer** *jfrogart*
> **oid** *md5:e26a6019c8da5d9a3e6f742c0c6cc02c*

or

> **#metapointer** *jfrogart*
> **oid** *name:myfilename.txt*

## Publish a new release
1. Make an annotated git tag using `git tag -a <version>` or `git tag -s <version>`, if signed tag is preferred.
2. Checkout the tag, cleanup the working tree.
3. Build the package: `npm run build -- --version <version>`.
4. Test the publish: `npm publish dist --dry-run`, check the package contents.
5. Perform the actual publishing: `npm publish dist`.
