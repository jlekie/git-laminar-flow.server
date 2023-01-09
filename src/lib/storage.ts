import * as Zod from 'zod';

import * as Path from 'path';
import * as FS from 'fs-extra';
import * as Yaml from 'js-yaml';

import { Readable } from 'stream';

import { BlobServiceClient } from '@azure/storage-blob';
import { S3, GetObjectCommand, HeadObjectCommand, ListObjectsCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import Axios from 'axios';

import * as Semver from 'semver';

import { ConfigSchema as RepoConfigSchema, resolveApiVersion, API_VERSION } from '@jlekie/git-laminar-flow';

import { Config } from './config';
import { Config as RepoConfig } from './repoConfig';
import { ConstructorParams, Lazy, streamToString } from './misc';

export const FileStorageSchema = Zod.object({
    storageType: Zod.literal('file'),
    name: Zod.string(),
    patterns: Zod.string().array().optional(),
    reposPath: Zod.string().optional()
});
export const AzureBlobStorageSchema = Zod.object({
    storageType: Zod.literal('azureBlobStorage'),
    name: Zod.string(),
    patterns: Zod.string().array().optional(),
    containerName: Zod.string(),
    leaseId: Zod.string(),
    // tenantId: Zod.string().optional(),
    // clientId: Zod.string().optional(),
    // clientSecret: Zod.string().optional(),
    connectionString: Zod.string().optional()
});
export const S3StorageSchema = Zod.object({
    storageType: Zod.literal('s3'),
    name: Zod.string(),
    patterns: Zod.string().array().optional(),
    endpoint: Zod.string().optional(),
    bucket: Zod.string(),
    accessKeyId: Zod.string().optional(),
    accessKeySecret: Zod.string().optional()
});
export const GlfsStorageSchema = Zod.object({
    storageType: Zod.literal('glfs'),
    name: Zod.string(),
    patterns: Zod.string().array().optional(),
    url: Zod.string(),
    apiKey: Zod.string()
});
export const StorageSchema = Zod.union([ FileStorageSchema, AzureBlobStorageSchema, S3StorageSchema, GlfsStorageSchema ]);

export interface LoadedConfig {
    readonly config: RepoConfig;
    release(): void | Promise<void>;
}

export abstract class StorageBase {
    public readonly name: string;
    public readonly patterns: readonly string[];

    readonly #parentConfig: () => Config;
    public get parentConfig() {
        return this.#parentConfig();
    }

    public static parse(value: unknown, params: Lazy<{ parentConfig: Config }>) {
        return this.fromSchema(StorageSchema.parse(value), params);
    }
    public static fromSchema(value: Zod.infer<typeof StorageSchema>, params: Lazy<{ parentConfig: Config }>) {
        if (value.storageType === 'file')
            return FileStorage.fromSchema(value, params);
        else if (value.storageType === 'azureBlobStorage')
            return AzureBlobStorage.fromSchema(value, params);
        else if (value.storageType === 's3')
            return S3Storage.fromSchema(value, params);
        else if (value.storageType === 'glfs')
            return GlfsStorage.fromSchema(value, params);
        else
            throw new Error(`Unknown storage type`);
    }

    public constructor(params: ConstructorParams<AzureBlobStorage, 'name', 'patterns'> & Lazy<{ parentConfig: Config }>) {
        this.name = params.name;
        this.patterns = params.patterns ?? [];

        this.#parentConfig = params.parentConfig;
    }

    public abstract configExists(namespace: string, name: string, support?: string): Promise<boolean>;
    public abstract loadConfig(namespace: string, name: string, support?: string): Promise<RepoConfig>;
    public abstract saveConfig(config: RepoConfig, namespace: string, name: string, support?: string): Promise<void>;
    public abstract deleteConfig(namespace: string, name: string, support?: string): Promise<void>;
    // public abstract lockConfig(namespace: string, name: string): Promise<void>;
    // public abstract unlockConfig(namespace: string, name: string): Promise<void>;
}

export class FileStorage extends StorageBase {
    public readonly reposPath: string;

    public static parse(value: unknown, params: Lazy<{ parentConfig: Config }>) {
        return this.fromSchema(FileStorageSchema.parse(value), params);
    }
    public static fromSchema(value: Zod.infer<typeof FileStorageSchema>, params: Lazy<{ parentConfig: Config }>) {
        return new FileStorage({
            name: value.name,
            patterns: value.patterns?.slice() ?? [ '**' ],
            reposPath: value.reposPath ?? '.',
            ...params
        });
    }

    public constructor(params: ConstructorParams<FileStorage, 'name' | 'patterns' | 'reposPath'> & Lazy<{ parentConfig: Config }>) {
        super(params);

        this.reposPath = params.reposPath;
    }

    // public async aquireConfig(namespace: string, name: string, cb: (config?: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>) {
    //     const [configPath, lockPath] = this.resolveConfigPaths(namespace, name);

    //     if (!await FS.pathExists(configPath))
    //         throw new Error(`Config does not exist [${configPath}]`);

    //     // Create lockfile
    //     await FS.ensureFile(lockPath);

    //     // Load config from disk
    //     const config = await FS.readFile(configPath, 'utf8')
    //         .then(content => Yaml.load(content))
    //         .then(hash => RepoConfig.parse(hash));

    //     // Handle config
    //     const updatedConfig = await cb(config);

    //     // Write config to disk
    //     if (updatedConfig) {
    //         const content = Yaml.dump(updatedConfig);
    //         await FS.writeFile(configPath, content, 'utf8');
    //     }

    //     // Remove lockfile
    //     await FS.remove(lockPath);
    // }
    public async configExists(namespace: string, name: string, support?: string): Promise<boolean> {
        throw new Error('Not Implemented');
    }
    public async loadConfig(namespace: string, name: string, support?: string): Promise<RepoConfig> {
        throw new Error('Not Implemented');
    }
    public async saveConfig(config: RepoConfig, namespace: string, name: string, support?: string): Promise<void> {
        throw new Error('Not Implemented');
    }
    public async deleteConfig(namespace: string, name: string, support?: string): Promise<void> {
        throw new Error('Not Implemented');
    }

    private resolveConfigPaths(namespace: string, name: string, support?: string) {
        return [
            Path.resolve('.gitflow', Path.normalize(`configs/${namespace}/${name}${support ? `/${support}` : ''}/gitflow.yml`).replace(/^(\.\.(\/|\\|$))+/, '')),
            Path.resolve('.gitflow', Path.normalize(`configs/${namespace}/${name}${support ? `/${support}` : ''}/gitflow.yml.lock`).replace(/^(\.\.(\/|\\|$))+/, ''))
        ] as const;
    }
}

export class AzureBlobStorage extends StorageBase {
    // public readonly tenantId: string;
    // public readonly clientId: string;
    // public readonly clientSecret: string;
    public readonly connectionString: string;
    public readonly containerName: string;
    public readonly leaseId: string;

    readonly #absClient: BlobServiceClient;

    public static parse(value: unknown, params: Lazy<{ parentConfig: Config }>) {
        return this.fromSchema(AzureBlobStorageSchema.parse(value), params);
    }
    public static fromSchema(value: Zod.infer<typeof AzureBlobStorageSchema>, params: Lazy<{ parentConfig: Config }>) {
        const connectionString = value.connectionString ?? process.env['AZ_STORAGE_CONNECTION_STRING'];
        if (!connectionString)
            throw new Error('Azure Blob Storage connection string not defined');

        // const tenantId = value.tenantId ?? process.env['AZ_TENANT_ID'];
        // if (!tenantId)
        //     throw new Error('Azure tenant ID not defined');

        // const clientId = value.clientId ?? process.env['AZ_CLIENT_ID'];
        // if (!clientId)
        //     throw new Error('Azure client ID not defined');

        // const clientSecret = value.clientSecret ?? process.env['AZ_CLIENT_SECRET'];
        // if (!clientSecret)
        //     throw new Error('Azure client secret not defined');

        return new AzureBlobStorage({
            name: value.name,
            patterns: value.patterns?.slice() ?? [ '**' ],
            containerName: value.containerName,
            leaseId: value.leaseId,
            // tenantId,
            // clientId,
            // clientSecret,
            connectionString,
            ...params
        });
    }

    public constructor(params: ConstructorParams<AzureBlobStorage, 'name' | 'patterns' | 'containerName' | 'leaseId' | 'connectionString'> & Lazy<{ parentConfig: Config }>) {
        super(params);

        this.containerName = params.containerName;
        this.leaseId = params.leaseId;
        // this.tenantId = params.tenantId;
        // this.clientId = params.clientId;
        // this.clientSecret = params.clientSecret;
        this.connectionString = params.connectionString;

        this.#absClient = BlobServiceClient.fromConnectionString(this.connectionString);
    }

    // public async aquireConfig(namespace: string, name: string, cb: (config?: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>) {
    //     const containerClient = this.#absClient.getContainerClient(this.containerName);
    //     const blobClient = containerClient.getBlockBlobClient(Path.normalize(`${namespace}/${name}.json`));
    //     const leaseClient = blobClient.getBlobLeaseClient(this.leaseId);

    //     const leaseResponse = await leaseClient.acquireLease(-1);

    //     const buffer = await blobClient.downloadToBuffer(0, undefined, {
    //         conditions: {
    //             leaseId: leaseResponse.leaseId
    //         }
    //     });
    //     const config = RepoConfig.parse(JSON.parse(buffer.toString('utf8')));

    //     const updatedConfig = await cb(config);

    //     if (updatedConfig) {
    //         const content = JSON.stringify(updatedConfig);
    //         await blobClient.upload(content, content.length, {
    //             blobHTTPHeaders: {
    //                 blobContentType: 'application/json'
    //             },
    //             conditions: {
    //                 leaseId: leaseResponse.leaseId
    //             }
    //         });
    //     }

    //     await leaseClient.releaseLease();
    // }
    public async configExists(namespace: string, name: string, support?: string): Promise<boolean> {
        const containerClient = this.#absClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(Path.normalize(`${namespace}/${name}${support ? `/${support}` : ''}.json`));

        return blobClient.exists();
    }
    public async loadConfig(namespace: string, name: string, support?: string): Promise<RepoConfig> {
        const containerClient = this.#absClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(Path.normalize(`${namespace}/${name}${support ? `/${support}` : ''}.json`));

        const properties = await blobClient.getProperties();
        const glfVersion = Semver.coerce(properties.metadata?.['glf_api_version'] ?? 'v0')?.toString()
        if (!glfVersion)
            throw new Error(`Bad metadata for version ${properties.metadata?.['glf_api_version']}`);
        if (Semver.gt(glfVersion, resolveApiVersion()))
            throw new Error(`Config api version ${glfVersion} incompatible with server api version ${resolveApiVersion()}`);

        const buffer = await blobClient.downloadToBuffer(0);
        const config = RepoConfig.parse(JSON.parse(buffer.toString('utf8')));

        return config;
    }
    public async saveConfig(config: RepoConfig, namespace: string, name: string, support?: string): Promise<void> {
        const containerClient = this.#absClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(Path.normalize(`${namespace}/${name}${support ? `/${support}` : ''}.json`));

        const content = JSON.stringify(config);
        await blobClient.upload(content, content.length, {
            metadata: {
                'glf_api_version': API_VERSION
            },
            blobHTTPHeaders: {
                blobContentType: 'application/json',
            }
        });
    }
    public async deleteConfig(namespace: string, name: string, support?: string): Promise<void> {
        throw new Error('Not Implemented');
    }
}

export class S3Storage extends StorageBase {
    public readonly endpoint?: string;
    public readonly bucket: string;
    public readonly accessKeyId: string;
    public readonly accessKeySecret: string;

    readonly #s3Client: S3;

    public static parse(value: unknown, params: Lazy<{ parentConfig: Config }>) {
        return this.fromSchema(S3StorageSchema.parse(value), params);
    }
    public static fromSchema(value: Zod.infer<typeof S3StorageSchema>, params: Lazy<{ parentConfig: Config }>) {
        const accessKeyId = value.accessKeyId ?? process.env['S3_ACCESS_KEY_ID'];
        if (!accessKeyId)
            throw new Error('S3 access key not defined');

        const accessKeySecret = value.accessKeySecret ?? process.env['S3_ACCESS_KEY_SECRET'];
        if (!accessKeySecret)
            throw new Error('S3 access secret not defined');

        return new S3Storage({
            name: value.name,
            patterns: value.patterns?.slice() ?? [ '**' ],
            endpoint: value.endpoint,
            bucket: value.bucket,
            accessKeyId,
            accessKeySecret,
            ...params
        });
    }

    public constructor(params: ConstructorParams<S3Storage, 'name' | 'patterns' | 'bucket' | 'accessKeyId' | 'accessKeySecret', 'endpoint'> & Lazy<{ parentConfig: Config }>) {
        super(params);

        this.endpoint = params.endpoint;
        this.bucket = params.bucket
        this.accessKeyId = params.accessKeyId;
        this.accessKeySecret = params.accessKeySecret;

        this.#s3Client = new S3({
            endpoint: this.endpoint,
            region: 'us-east-1',
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.accessKeySecret
            }
        });
    }

    // public async aquireConfig(namespace: string, name: string, cb: (config?: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>) {
    //     throw new Error('Not Implemented');
    // }
    public async configExists(namespace: string, name: string, support?: string): Promise<boolean> {
        return await this.#s3Client.send(new HeadObjectCommand({
            Bucket: this.bucket,
            Key: `${namespace}/${name}${support ? `/${support}` : ''}.json`
        })).then(() => true).catch(() => false);
    }
    public async loadConfig(namespace: string, name: string, support?: string): Promise<RepoConfig> {
        const response = await this.#s3Client.send(new GetObjectCommand({
            Bucket: this.bucket,
            Key: `${namespace}/${name}${support ? `/${support}` : ''}.json`
        }));

        const glfVersion = Semver.coerce(response.Metadata?.['glf-api-version'] ?? 'v0')?.toString();
        if (!glfVersion)
            throw new Error(`Bad metadata for version ${response.Metadata?.['glf-api-version']}`);
        if (Semver.gt(glfVersion, resolveApiVersion()))
            throw new Error(`Config api version ${glfVersion} incompatible with server api version ${resolveApiVersion()}`);

        const content = await streamToString(response.Body as Readable);
        const config = RepoConfig.parse(JSON.parse(content));

        return config;
    }
    public async saveConfig(config: RepoConfig, namespace: string, name: string, support?: string): Promise<void> {
        await this.#s3Client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: `${namespace}/${name}${support ? `/${support}` : ''}.json`,
            Body: JSON.stringify(config),
            ContentType: 'application/json',
            Metadata: {
                'glf-api-version': API_VERSION
            }
        }));
    }
    public async deleteConfig(namespace: string, name: string, support?: string): Promise<void> {
        throw new Error('Not Implemented');
    }
}

export class GlfsStorage extends StorageBase {
    public readonly url: string;
    public readonly apiKey: string;

    public static parse(value: unknown, params: Lazy<{ parentConfig: Config }>) {
        return this.fromSchema(GlfsStorageSchema.parse(value), params);
    }
    public static fromSchema(value: Zod.infer<typeof GlfsStorageSchema>, params: Lazy<{ parentConfig: Config }>) {
        return new GlfsStorage({
            name: value.name,
            patterns: value.patterns?.slice() ?? [ '**' ],
            url: value.url,
            apiKey: value.apiKey,
            ...params
        });
    }

    public constructor(params: ConstructorParams<GlfsStorage, 'name' | 'patterns' | 'url' | 'apiKey'> & Lazy<{ parentConfig: Config }>) {
        super(params);

        this.url = params.url;
        this.apiKey = params.apiKey
    }

    // public async aquireConfig(namespace: string, name: string, cb: (config?: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>) {
    //     throw new Error('Not Implemented');
    // }
    public async configExists(namespace: string, name: string, support?: string): Promise<boolean> {
        return await Axios.head(`${this.url}/v1/${namespace}/${name}${support ? `/${support}` : ''}`, {
            auth: {
                username: 'glf.server',
                password: this.apiKey
            }
        }).then(() => true).catch(() => false);
    }
    public async loadConfig(namespace: string, name: string, support?: string): Promise<RepoConfig> {
        const response = await Axios.get(`${this.url}/v1/${namespace}/${name}${support ? `/${support}` : ''}`, {
            auth: {
                username: 'glf.server',
                password: this.apiKey
            }
        });

        const config = RepoConfig.parse(response.data);

        return config;
    }
    public async saveConfig(config: RepoConfig, namespace: string, name: string, support?: string): Promise<void> {
        await Axios.put(`${this.url}/v1/${namespace}/${name}${support ? `/${support}` : ''}`, config.toHash(), {
            auth: {
                username: 'glf.server',
                password: this.apiKey
            }
        });
    }
    public async deleteConfig(namespace: string, name: string, support?: string): Promise<void> {
        throw new Error('Not Implemented');
    }
}
