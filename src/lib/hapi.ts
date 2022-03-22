import * as Zod from 'zod';

import * as Hapi from '@hapi/hapi';

import * as Glf from '@jlekie/git-laminar-flow';

import { loadNpmPackage } from './package';
import { Config } from './config';
import { Config as RepoConfig } from './repoConfig';
import { Registry } from './registry';

export interface CreateHapiServerParams {
    serverName: string;
    host: string;
    port: number;
    config: Config;
    registry: Registry;
}
export async function createHapiServer({ host, port, serverName, config, registry }: CreateHapiServerParams) {
    const npmPackage = await loadNpmPackage();

    const server = Hapi.server({
        host,
        port,
        debug: false
        // debug: {
        //     request: [ 'error' ]
        // }
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: () => `Git Laminar Flow API Server v${npmPackage.version} "${serverName}"`
    });
    server.route({
        method: 'GET',
        path: '/config',
        handler: () => {
            return config;
        }
    });

    await server.register({
        plugin: apiPlugin,
        routes: {
            prefix: '/v1'
        },
        options: {
            registry
        }
    });

    return server;
}

export const apiPlugin: Hapi.Plugin<{ registry: Registry }> = {
    name: 'api',
    register: async (server, { registry }) => {
        server.route({
            method: 'GET',
            path: '/',
            handler: async (req, res) => {
                return {
                    identifier: 'Test'
                }
            }
        });

        server.route({
            method: 'GET',
            path: '/{namespace}/{name}',
            handler: async (req, h) => {
                const config = await registry.repoConfigExists(req.params.namespace, req.params.name)
                    ? await registry.loadRepoConfig(req.params.namespace, req.params.name)
                    : ('ensure' in req.query ? RepoConfig.createNew() : undefined);

                if (config)
                    return h.response(config.toHash()).etag(config.calculateHash());
                else
                    return h.response().code(404);
            }
        });

        server.route({
            method: 'PUT',
            path: '/{namespace}/{name}',
            handler: async (req, h) => {
                const sourceConfig = await registry.repoConfigExists(req.params.namespace, req.params.name)
                    ? await registry.loadRepoConfig(req.params.namespace, req.params.name)
                    : null;
                const sourceConfigHash = sourceConfig?.calculateHash();

                if (sourceConfigHash && sourceConfigHash !== req.headers['if-match'])
                    return h.response().code(412);

                const config = RepoConfig.parse(req.payload);
                const configHash = config.calculateHash();

                if (configHash !== sourceConfigHash) {
                    console.log(`Saving config <${configHash}>`);
                    await registry.saveRepoConfig(req.params.namespace, req.params.name, config);
                }

                return h.response();
            }
        });

        server.route({
            method: 'DELETE',
            path: '/{namespace}/{name}',
            handler: async (req, h) => {
                if (await registry.repoConfigExists(req.params.namespace, req.params.name)) {
                    const sourceConfig = await registry.loadRepoConfig(req.params.namespace, req.params.name);

                    const sourceConfigHash = sourceConfig?.calculateHash();

                    if (sourceConfigHash && sourceConfigHash !== req.headers['if-match'])
                        return h.response().code(412);

                    await registry.deleteRepoConfig(req.params.namespace, req.params.name);

                    return h.response();
                }
                else {
                    return h.response().code(404);
                }
            }
        });
    }
}
