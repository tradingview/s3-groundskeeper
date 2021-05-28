declare module 's3-groundskeeper' {

/// <reference types="node" />
import * as stream from 'stream';
import * as fs from 'fs';



  export interface ArtifactoryConfig {
      protocol?: string;
      host: string;
      user?: string;
      apiKey?: string;
      password?: string;
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
      resolveUri(item: ArtifactoryItemMeta | string): string;
  }
  export function createArtifactoryClient(config: ArtifactoryConfig): ArtifactoryClient;


  export interface MetaPointer {
      readonly source: string;
      oid: {
          kind: string;
          value: string;
      };
  }
  export function readMetaPointerFromFile(filePath: string, stats?: fs.Stats): Promise<MetaPointer | undefined>;

}