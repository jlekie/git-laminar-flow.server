#!/usr/bin/env node
import 'source-map-support/register';
import 'dotenv/config';

import { Builtins, Cli } from 'clipanion';

import { ServerCommands } from './commands';

const [ node, app, ...args ] = process.argv;
const cli = new Cli({
    binaryName: 'git-laminar-flow-server',
    binaryLabel: 'Git Laminar Flow API Server',
    binaryVersion: '1.0.0'
});

cli.register(ServerCommands.StartCommand);

cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

cli.runExit(args);