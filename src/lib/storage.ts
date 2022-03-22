import * as Zod from 'zod';

import * as Path from 'path';
import * as FS from 'fs-extra';
import * as Yaml from 'js-yaml';

import { BlobServiceClient } from '@azure/storage-blob';

import { ConfigSchema as RepoConfigSchema } from '@jlekie/git-laminar-flow';

import { Config } from './config';
import { Config as RepoConfig } from './repoConfig';
import { ConstructorParams, Lazy } from './misc';

export const FileStorageSchema = Zod.object({
    storageType: Zod.literal('file'),
    name: Zod.string(),
    reposPath: Zod.string().optional()
});
export const AzureBlobStorageSchema = Zod.object({
    storageType: Zod.literal('azureBlobStorage'),
    name: Zod.string(),
    containerName: Zod.string(),
    leaseId: Zod.string(),
    // tenantId: Zod.string().optional(),
    // clientId: Zod.string().optional(),
    // clientSecret: Zod.string().optional(),
    connectionString: Zod.string().optional()
});
export const StorageSchema = Zod.union([ FileStorageSchema, AzureBlobStorageSchema ]);

export interface LoadedConfig {
    readonly config: RepoConfig;
    release(): void | Promise<void>;
}

export abstract class StorageBase {
    public readonly name: string;

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
        else
            throw new Error(`Unknown storage type`);
    }

    public constructor(params: ConstructorParams<AzureBlobStorage, 'name'> & Lazy<{ parentConfig: Config }>) {
        this.name = params.name;

        this.#parentConfig = params.parentConfig;
    }

    public abstract aquireConfig(namespace: string, name: string, cb: (config?: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>): Promise<void>;

    public abstract configExists(namespace: string, name: string): Promise<boolean>;
    public abstract loadConfig(namespace: string, name: string): Promise<RepoConfig>;
    public abstract saveConfig(namespace: string, name: string, config: RepoConfig): Promise<void>;
    public abstract deleteConfig(namespace: string, name: string): Promise<void>;
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
            reposPath: value.reposPath ?? '.',
            ...params
        });
    }

    public constructor(params: ConstructorParams<FileStorage, 'name' | 'reposPath'> & Lazy<{ parentConfig: Config }>) {
        super(params);

        this.reposPath = params.reposPath;
    }

    public async aquireConfig(namespace: string, name: string, cb: (config?: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>) {
        const [configPath, lockPath] = this.resolveConfigPaths(namespace, name);

        if (!await FS.pathExists(configPath))
            throw new Error(`Config does not exist [${configPath}]`);

        // Create lockfile
        await FS.ensureFile(lockPath);

        // Load config from disk
        const config = await FS.readFile(configPath, 'utf8')
            .then(content => Yaml.load(content))
            .then(hash => RepoConfig.parse(hash));

        // Handle config
        const updatedConfig = await cb(config);

        // Write config to disk
        if (updatedConfig) {
            const content = Yaml.dump(updatedConfig);
            await FS.writeFile(configPath, content, 'utf8');
        }

        // Remove lockfile
        await FS.remove(lockPath);
    }
    public async configExists(namespace: string, name: string): Promise<boolean> {
        throw new Error('Not Implemented');
    }
    public async loadConfig(namespace: string, name: string): Promise<RepoConfig> {
        throw new Error('Not Implemented');
    }
    public async saveConfig(namespace: string, name: string, config: RepoConfig): Promise<void> {
        throw new Error('Not Implemented');
    }
    public async deleteConfig(namespace: string, name: string): Promise<void> {
        throw new Error('Not Implemented');
    }

    private resolveConfigPaths(namespace: string, name: string) {
        return [
            Path.resolve('.gitflow', Path.normalize(`configs/${namespace}/${name}/gitflow.yml`).replace(/^(\.\.(\/|\\|$))+/, '')),
            Path.resolve('.gitflow', Path.normalize(`configs/${namespace}/${name}/gitflow.yml.lock`).replace(/^(\.\.(\/|\\|$))+/, ''))
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
            containerName: value.containerName,
            leaseId: value.leaseId,
            // tenantId,
            // clientId,
            // clientSecret,
            connectionString,
            ...params
        });
    }

    public constructor(params: ConstructorParams<AzureBlobStorage, 'name' | 'containerName' | 'leaseId' | 'connectionString'> & Lazy<{ parentConfig: Config }>) {
        super(params);

        this.containerName = params.containerName;
        this.leaseId = params.leaseId;
        // this.tenantId = params.tenantId;
        // this.clientId = params.clientId;
        // this.clientSecret = params.clientSecret;
        this.connectionString = params.connectionString;

        this.#absClient = BlobServiceClient.fromConnectionString(this.connectionString);
    }

    public async aquireConfig(namespace: string, name: string, cb: (config?: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>) {
        const containerClient = this.#absClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(Path.normalize(`${namespace}/${name}.json`));
        const leaseClient = blobClient.getBlobLeaseClient(this.leaseId);

        const leaseResponse = await leaseClient.acquireLease(-1);

        const buffer = await blobClient.downloadToBuffer(0, undefined, {
            conditions: {
                leaseId: leaseResponse.leaseId
            }
        });
        const config = RepoConfig.parse(JSON.parse(buffer.toString('utf8')));

        const updatedConfig = await cb(config);

        if (updatedConfig) {
            const content = JSON.stringify(updatedConfig);
            await blobClient.upload(content, content.length, {
                blobHTTPHeaders: {
                    blobContentType: 'application/json'
                },
                conditions: {
                    leaseId: leaseResponse.leaseId
                }
            });
        }

        await leaseClient.releaseLease();
    }
    public async configExists(namespace: string, name: string): Promise<boolean> {
        const containerClient = this.#absClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(Path.normalize(`${namespace}/${name}.json`));

        return blobClient.exists();
    }
    public async loadConfig(namespace: string, name: string): Promise<RepoConfig> {
        const containerClient = this.#absClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(Path.normalize(`${namespace}/${name}.json`));

        const buffer = await blobClient.downloadToBuffer(0);
        const config = RepoConfig.parse(JSON.parse(buffer.toString('utf8')));

        return config;
    }
    public async saveConfig(namespace: string, name: string, config: RepoConfig): Promise<void> {
        const containerClient = this.#absClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlockBlobClient(Path.normalize(`${namespace}/${name}.json`));

        const content = JSON.stringify(config);
        await blobClient.upload(content, content.length, {
            blobHTTPHeaders: {
                blobContentType: 'application/json'
            }
        });
    }
    public async deleteConfig(namespace: string, name: string): Promise<void> {
        throw new Error('Not Implemented');
    }
}
