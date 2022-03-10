import { Command, Option } from 'clipanion';
import * as Typanion from 'typanion';
import * as Chalk from 'chalk';

import * as Bluebird from 'bluebird';

import * as OS from 'os';
import * as Path from 'path';

import * as Faker from '@faker-js/faker';

import { createHapiServer } from '../lib/hapi';
import { loadConfig } from '../lib/config';
import { createRegistry } from '../lib/registry';

export class StartCommand extends Command {
    static paths = [['start']];

    config = Option.String('--config', Path.resolve(OS.homedir(), '.gitflow/server.yml'));

    host = Option.String('--hostname', '0.0.0.0');
    port = Option.String('--port', '8080', { validator: Typanion.isNumber() });

    static usage = Command.Usage({
        description: 'Start server',
        details: 'Start the API server'
    });

    public async execute() {
        const config = await loadConfig(this.config);
        const registry = await createRegistry(config);

        // const azureBackend = config.storageBackends.find(b => b.name === 'azure');
        // if (azureBackend) {
        //     await azureBackend.aquireConfig('greenheck', 'test', config => {
        //         console.log(config);
        //     });
        // }

        const serverName = Faker.commerce.productName();
        const hapiServer = await createHapiServer({
            host: this.host,
            port: this.port,
            serverName,
            config,
            registry
        });

        hapiServer.events.on('start', () => this.context.stdout.write(Chalk.cyan(`Hapi server "${serverName}" started at ${hapiServer.info.uri}\n`)));
        hapiServer.events.on('log', (event) => this.context.stdout.write(Chalk.gray(event) + '\n'));
        hapiServer.events.on('response', (request) => this.context.stdout.write(Chalk.gray(`${request.info.remoteAddress} - - [${new Date(request.info.received).toUTCString()}] "${request.raw.req.method?.toUpperCase() ?? '-'} ${request.raw.req.url ?? '-'} HTTP/${request.raw.req.httpVersion}" ${request.raw.res.statusCode} ${request.info.completed - request.info.received}ms\n`)));

        await hapiServer.start();
    }
}