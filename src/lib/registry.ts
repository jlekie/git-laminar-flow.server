import * as FS from 'fs-extra';
import * as Yaml from 'js-yaml';

import { v4 as Uuid } from 'uuid';

import * as Zod from 'zod';

import { SimpleEventDispatcher } from 'strongly-typed-events';

import * as Minimatch from 'minimatch';

import { Config } from './config';
import { Config as RepoConfig } from './repoConfig';
import { ConstructorParams } from './misc';

export class Registry {
    public readonly config: Config;

    #resolvedBackendDispatcher = new SimpleEventDispatcher<{ registry: string, namespace: string, name: string, backendName: string }>();
    public get onResolvedBackend() {
        return this.#resolvedBackendDispatcher.asEvent();
    }

    public constructor(params: ConstructorParams<Registry, 'config'>) {
        this.config = params.config;
    }

    public async repoConfigExists(registry: string, namespace: string, name: string) {
        const backend = this.getBackend(registry, namespace, name);

        return backend.configExists(namespace, name);
    }
    public async loadRepoConfig(registry: string, namespace: string, name: string) {
        const backend = this.getBackend(registry, namespace, name);

        return backend.loadConfig(namespace, name);
    }
    public async saveRepoConfig(registry: string, namespace: string, name: string, config: RepoConfig) {
        const backend = this.getBackend(registry, namespace, name);

        await backend.saveConfig(namespace, name, config);
    }
    public async deleteRepoConfig(registry: string, namespace: string, name: string) {
        const backend = this.getBackend(registry, namespace, name);

        await backend.deleteConfig(namespace, name);
    }
    public async aquireRepoConfig(registry: string, namespace: string, name: string, cb: (config: RepoConfig) => void | RepoConfig | Promise<void | RepoConfig>) {
        const backend = this.getBackend(registry, namespace, name);

        await backend.aquireConfig(namespace, name, cb);
    }

    private getBackend(registry: string, namespace: string, name: string) {
        const backend = this.config.storageBackends.find(b => b.patterns.some(p => Minimatch(`${registry}/${namespace}/${name}`, p)));

        if (!backend)
            throw new Error(`Could not find matching backend for ${registry}/${namespace}/${name}`);

        this.#resolvedBackendDispatcher.dispatch({ registry, namespace, name, backendName: backend.name });
        // console.log(`Resolved backend for [${registry}/${namespace}/${name}]: ${backend.name}`);

        return backend;
    }
}

export async function createRegistry(config: Config) {
    return new Registry({
        config
    });
}
