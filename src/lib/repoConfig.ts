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

export type ConfigParams = Pick<Config, 'identifier' | 'upstreams' | 'submodules' | 'features' | 'releases' | 'hotfixes' | 'supports' | 'included' | 'excluded'> & Partial<Pick<Config, 'featureMessageTemplate' | 'releaseMessageTemplate' | 'hotfixMessageTemplate' | 'releaseTagTemplate' | 'hotfixTagTemplate'>>;
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
    public featureMessageTemplate?: string;
    public releaseMessageTemplate?: string;
    public hotfixMessageTemplate?: string;
    public releaseTagTemplate?: string;
    public hotfixTagTemplate?: string;

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
        this.featureMessageTemplate = params.featureMessageTemplate;
        this.releaseMessageTemplate = params.releaseMessageTemplate;
        this.hotfixMessageTemplate = params.hotfixMessageTemplate;
        this.releaseTagTemplate = params.releaseTagTemplate;
        this.hotfixTagTemplate = params.hotfixTagTemplate;
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

export type FeatureParams = Pick<Feature, 'name' | 'branchName' | 'sourceSha' | 'upstream'>;
export class Feature {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public upstream?: string;

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
        this.upstream = params.upstream;
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Feature extends FeatureBase {}
applyMixins(Feature, [ FeatureBase ]);

export type ReleaseParams = Pick<Release, 'name' | 'branchName' | 'sourceSha' | 'upstream'> & Partial<Pick<Release, 'intermediate'>>;
export class Release {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public upstream?: string;
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
        this.upstream = params.upstream;
        this.intermediate = params.intermediate ?? false;
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Release extends ReleaseBase {}
applyMixins(Release, [ ReleaseBase ]);

export type HotfixParams = Pick<Hotfix, 'name' | 'branchName' | 'sourceSha' | 'upstream'> & Partial<Pick<Hotfix, 'intermediate'>>;
export class Hotfix {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public upstream?: string;
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
        this.upstream = params.upstream;
        this.intermediate = params.intermediate ?? false;
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Hotfix extends HotfixBase {}
applyMixins(Hotfix, [ HotfixBase ]);

export type SupportParams = Pick<Support, 'name' | 'masterBranchName' | 'developBranchName' | 'sourceSha' | 'features' | 'releases' | 'hotfixes' | 'upstream'>;
export class Support {
    public name: string;
    public masterBranchName: string;
    public developBranchName: string;
    public sourceSha: string;
    public upstream?: string;

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
        this.upstream = params.upstream;

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
