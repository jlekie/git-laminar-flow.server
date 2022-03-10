import * as FS from 'fs-extra';
import * as Yaml from 'js-yaml';

import { v4 as Uuid } from 'uuid';

import * as Zod from 'zod';

import { Config } from './config';
import { Config as RepoConfig } from './repoConfig';
import { ConstructorParams } from './misc';

export class Registry {
    public readonly config: Config;

    public constructor(params: ConstructorParams<Registry, 'config'>) {
        this.config = params.config;
    }

    public async repoConfigExists(namespace: string, name: string) {
        const backend = this.config.storageBackends.find(b => b.name === 'azure');
        if (!backend)
            throw new Error('Backend not found');

        return backend.configExists(namespace, name);
    }
    public async loadRepoConfig(namespace: string, name: string) {
        const backend = this.config.storageBackends.find(b => b.name === 'azure');
        if (!backend)
            throw new Error('Backend not found');

        return backend.loadConfig(namespace, name);
    }
    public async saveRepoConfig(namespace: string, name: string, config: RepoConfig) {
        const backend = this.config.storageBackends.find(b => b.name === 'azure');
        if (!backend)
            throw new Error('Backend not found');

        await backend.saveConfig(namespace, name, config);
    }

    public async aquireRepoConfig(namespace: string, name: string, cb: (config: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>) {
        const backend = this.config.storageBackends.find(b => b.name === 'azure');
        if (!backend)
            throw new Error('Backend not found');

        await backend.aquireConfig(namespace, name, cb);
    }
}

export async function createRegistry(config: Config) {
    return new Registry({
        config
    });
}