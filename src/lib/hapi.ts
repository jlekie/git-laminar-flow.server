import * as Zod from 'zod';

import * as Hapi from '@hapi/hapi';
import * as BasicAuth from '@hapi/basic';
import * as Boom from '@hapi/boom';

import * as Glf from '@jlekie/git-laminar-flow';

import { loadNpmPackage } from './package';
import { Config } from './config';
import { Config as RepoConfig } from './repoConfig';
import { Registry } from './registry';

import * as Semver from 'semver';

export type T = Hapi.Auth

export interface CreateHapiServerParams {
    serverName: string;
    host: string;
    port: number;
    config: Config;
    registry: Registry;
}
export async function createHapiServer({ host, port, serverName, config, registry }: CreateHapiServerParams) {
    const npmPackage = await loadNpmPackage();

    const apiKey = config.apiKey ?? process.env['API_KEY'];

    const server = Hapi.server({
        host,
        port,
        // debug: false
        debug: {
            request: [ 'error' ]
        },
        routes: {
            cors: {
                origin: [ '*' ],
                headers: [ 'Authorization', 'Glf-Api-Version' ],
                exposedHeaders: [ 'Accept' ],
                additionalExposedHeaders: [ 'Accept' ],
                maxAge: 60,
                credentials: true
            }
        }
    });

    if (apiKey) {
        await server.register(BasicAuth);
        server.auth.strategy('simple', 'basic', {
            validate: async (req: Hapi.Request, username: string, password: string) => {
                return {
                    isValid: password === apiKey,
                    credentials: {
                        name: username
                    }
                }
            }
        });
    }

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
            registry,
            auth: apiKey && 'simple'
        }
    });

    return server;
}

export const apiPlugin: Hapi.Plugin<{ registry: Registry, auth?: string }> = {
    name: 'api',
    register: async (server, { registry, auth }) => {
        const validateVersion: Hapi.Lifecycle.Method = (req, h) => {
            const reqApiVersion = Semver.coerce(req.headers['glf-api-version'] ?? 'v0')?.toString();
            if (!reqApiVersion)
                throw Boom.badRequest(`request api version ${req.headers['glf-api-version']} invalid`);
            if (!Semver.eq(reqApiVersion, Glf.resolveApiVersion()))
                throw Boom.badRequest(`request api version ${reqApiVersion} incompatible with server api version ${Glf.resolveApiVersion()}`);

            return h.continue;
        }

        server.route({
            method: 'GET',
            path: '/',
            options: {
                pre: [
                    { method: validateVersion }
                ]
            },
            handler: async (req, h) => {
                return h.response({
                    identifier: 'Test'
                });
            }
        });

        server.route({
            method: 'GET',
            path: '/{registry}/{namespace}/{name}',
            handler: async (req, h) => {
                const config = await registry.repoConfigExists(req.params.registry, req.params.namespace, req.params.name)
                    ? await registry.loadRepoConfig(req.params.registry, req.params.namespace, req.params.name)
                    : ('ensure' in req.query ? RepoConfig.createNew() : undefined);

                if (!config)
                    throw Boom.notFound(`no config defined`);
                if (Semver.gt(config.resolveApiVersion(), Glf.resolveApiVersion()))
                    throw Boom.badRequest(`config api version ${config.resolveApiVersion()} incompatible with server api version ${Glf.resolveApiVersion()}`);

                return h.response(config.toHash()).etag(config.calculateHash());
            },
            options: {
                auth,
                pre: [
                    { method: validateVersion }
                ]
            }
        });

        server.route({
            method: 'PUT',
            path: '/{registry}/{namespace}/{name}',
            handler: async (req, h) => {
                const sourceConfig = await registry.repoConfigExists(req.params.registry, req.params.namespace, req.params.name)
                    ? await registry.loadRepoConfig(req.params.registry, req.params.namespace, req.params.name)
                    : null;
                const sourceConfigHash = sourceConfig?.calculateHash();

                if (sourceConfigHash && sourceConfigHash !== req.headers['if-match'])
                    throw Boom.preconditionFailed(`hash check failed`);

                const config = RepoConfig.parse(req.payload);
                const configHash = config.calculateHash();

                if (configHash !== sourceConfigHash) {
                    // console.log(`Saving config <${configHash}>`);
                    await registry.saveRepoConfig(req.params.registry, req.params.namespace, req.params.name, config);
                }

                return h.response();
            },
            options: {
                auth,
                pre: [
                    { method: validateVersion }
                ]
            }
        });

        server.route({
            method: 'DELETE',
            path: '/{registry}/{namespace}/{name}',
            handler: async (req, h) => {
                if (await registry.repoConfigExists(req.params.registry, req.params.namespace, req.params.name)) {
                    const sourceConfig = await registry.loadRepoConfig(req.params.registry, req.params.namespace, req.params.name);

                    const sourceConfigHash = sourceConfig?.calculateHash();
                    if (sourceConfigHash && sourceConfigHash !== req.headers['if-match'])
                        throw Boom.preconditionFailed(`hash check failed`);

                    await registry.deleteRepoConfig(req.params.registry, req.params.namespace, req.params.name);

                    return h.response();
                }
                else {
                    throw Boom.notFound(`no config defined`);
                }
            },
            options: {
                auth,
                pre: [
                    { method: validateVersion }
                ]
            }
        });
    }
}
