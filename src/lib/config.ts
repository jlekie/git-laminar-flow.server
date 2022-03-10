import * as FS from 'fs-extra';
import * as Yaml from 'js-yaml';

import * as Zod from 'zod';

import { StorageBase, StorageSchema } from './storage';
import { ConstructorParams, Lazy } from './misc';

export const ConfigSchema = Zod.object({
    storageBackends: StorageSchema.array().optional()
});

export class Config {
    public readonly storageBackends: StorageBase[];

    public static parse(value: unknown) {
        return this.fromSchema(ConfigSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigSchema>) {
        const config: Config = new Config({
            storageBackends: value.storageBackends?.map(i => StorageBase.fromSchema(i, {
                parentConfig: () => config
            })) ?? []
        });

        return config;
    }

    public static createNew() {
        return new Config({
            storageBackends: []
        });
    }

    public constructor(params: ConstructorParams<Config, 'storageBackends'>) {
        this.storageBackends = params.storageBackends;
    }
}

export async function loadConfig(path: string) {
    const config = await FS.pathExists(path)
        ? await FS.readFile(path, 'utf8')
            .then(content => Yaml.load(content))
            .then(hash => Config.parse(hash))
        : Config.createNew();

    return config;
}