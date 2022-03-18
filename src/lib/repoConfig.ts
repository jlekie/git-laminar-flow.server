import * as Zod from 'zod';

import { v4 as Uuid } from 'uuid';

import {
    ConfigSchema, ConfigSubmoduleSchema, ConfigFeatureSchema, ConfigReleaseSchema, ConfigHotfixSchema, ConfigSupportSchema,
    ConfigBase, SubmoduleBase, FeatureBase, ReleaseBase, HotfixBase, SupportBase
} from '@jlekie/git-laminar-flow';

function applyMixins(derivedCtor: any, constructors: any[]) {
    constructors.forEach((baseCtor) => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
            Object.defineProperty(
                derivedCtor.prototype,
                name,
                Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
            );
        });
    });
}

export type ConfigParams = Pick<Config, 'identifier' | 'upstreams' | 'submodules' | 'features' | 'releases' | 'hotfixes' | 'supports' | 'included' | 'excluded'>;
export class Config {
    public identifier: string;
    public upstreams: Array<{ name: string, url: string }>;
    public submodules: Submodule[];
    public features: Feature[];
    public releases: Release[];
    public hotfixes: Hotfix[];
    public supports: Support[];
    public included: string[];
    public excluded: string[];

    public static parse(value: unknown) {
        return this.fromSchema(ConfigSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigSchema>) {
        const config = new Config({
            ...value,
            upstreams: value.upstreams?.map(i => ({ ...i })) ?? [],
            submodules: value.submodules?.map( i => Submodule.fromSchema(i)) ?? [],
            features: value.features?.map(i => Feature.fromSchema(i)) ?? [],
            releases: value.releases?.map(i => Release.fromSchema(i)) ?? [],
            hotfixes: value.hotfixes?.map(i => Hotfix.fromSchema(i)) ?? [],
            supports: value.supports?.map(i => Support.fromSchema(i)) ?? [],
            included: value.included?.slice() ?? [],
            excluded: value.excluded?.slice() ?? []
        });

        return config;
    }

    public static createNew() {
        return new Config({
            identifier: Uuid().replace(/-/g, ''),
            upstreams: [],
            submodules: [],
            features: [],
            releases: [],
            hotfixes: [],
            supports: [],
            included: [],
            excluded: []
        });
    }

    public constructor(params: ConfigParams) {
        this.identifier = params.identifier;
        this.upstreams = params.upstreams;
        this.submodules = params.submodules;
        this.features = params.features;
        this.releases = params.releases;
        this.hotfixes = params.hotfixes;
        this.supports = params.supports;
        this.included = params.included;
        this.excluded = params.excluded;
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Config extends ConfigBase {}
applyMixins(Config, [ ConfigBase ]);

export type SubmoduleParams = Pick<Submodule, 'name' | 'path' | 'url'>;
export class Submodule {
    public name: string;
    public path: string;
    public url?: string;

    public static parse(value: unknown) {
        return this.fromSchema(ConfigSubmoduleSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigSubmoduleSchema>) {
        return new this({
            ...value
        });
    }

    public constructor(params: SubmoduleParams) {
        this.name = params.name;
        this.path = params.path;
        this.url = params.url;
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Submodule extends SubmoduleBase {}
applyMixins(Submodule, [ SubmoduleBase ]);

export type FeatureParams = Pick<Feature, 'name' | 'branchName' | 'sourceSha'> & Partial<Pick<Feature, 'sources'>>;
export class Feature {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public sources: string[];

    public static parse(value: unknown) {
        return this.fromSchema(ConfigFeatureSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigFeatureSchema>) {
        return new this({
            ...value
        });
    }

    public constructor(params: FeatureParams) {
        this.name = params.name;
        this.branchName = params.branchName;
        this.sourceSha = params.sourceSha;
        this.sources = params.sources ?? [];
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Feature extends FeatureBase {}
applyMixins(Feature, [ FeatureBase ]);

export type ReleaseParams = Pick<Release, 'name' | 'branchName' | 'sourceSha'> & Partial<Pick<Release, 'sources' | 'intermediate'>>;
export class Release {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public sources: string[];
    public intermediate: boolean;

    public static parse(value: unknown) {
        return this.fromSchema(ConfigReleaseSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigReleaseSchema>) {
        return new this({
            ...value
        });
    }

    public constructor(params: ReleaseParams) {
        this.name = params.name;
        this.branchName = params.branchName;
        this.sourceSha = params.sourceSha;
        this.sources = params.sources ?? [];
        this.intermediate = params.intermediate ?? false;
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Release extends ReleaseBase {}
applyMixins(Release, [ ReleaseBase ]);

export type HotfixParams = Pick<Hotfix, 'name' | 'branchName' | 'sourceSha'> & Partial<Pick<Hotfix, 'sources' | 'intermediate'>>;
export class Hotfix {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public sources: string[];
    public intermediate: boolean;

    public static parse(value: unknown) {
        return this.fromSchema(ConfigHotfixSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigHotfixSchema>) {
        return new this({
            ...value
        });
    }

    public constructor(params: HotfixParams) {
        this.name = params.name;
        this.branchName = params.branchName;
        this.sourceSha = params.sourceSha;
        this.sources = params.sources ?? [];
        this.intermediate = params.intermediate ?? false;
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Hotfix extends HotfixBase {}
applyMixins(Hotfix, [ HotfixBase ]);

export type SupportParams = Pick<Support, 'name' | 'masterBranchName' | 'developBranchName' | 'sourceSha' | 'features' | 'releases' | 'hotfixes'>;
export class Support {
    public name: string;
    public masterBranchName: string;
    public developBranchName: string;
    public sourceSha: string;

    public features: Feature[];
    public releases: Release[];
    public hotfixes: Hotfix[];

    public static parse(value: unknown) {
        return this.fromSchema(ConfigSupportSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigSupportSchema>) {
        return new this({
            ...value,
            features: value.features?.map(i => Feature.fromSchema(i)) ?? [],
            releases: value.releases?.map(i => Release.fromSchema(i)) ?? [],
            hotfixes: value.hotfixes?.map(i => Hotfix.fromSchema(i)) ?? []
        });
    }

    public constructor(params: SupportParams) {
        this.name = params.name;
        this.masterBranchName = params.masterBranchName;
        this.developBranchName = params.developBranchName;
        this.sourceSha = params.sourceSha;

        this.features = params.features;
        this.releases = params.releases;
        this.hotfixes = params.hotfixes;
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Support extends SupportBase {}
applyMixins(Support, [ SupportBase ]);
