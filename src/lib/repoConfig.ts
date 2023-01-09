import * as _ from 'lodash';
import * as Zod from 'zod';

import { v4 as Uuid } from 'uuid';

import {
    ConfigSchema, ConfigSubmoduleSchema, ConfigFeatureSchema, ConfigReleaseSchema, ConfigHotfixSchema, ConfigSupportSchema, ConfigIntegrationSchema, ConfigTaggingSchema, ConfigMessageTemplate, ConfigTagTemplate,
    ConfigBase, SubmoduleBase, FeatureBase, ReleaseBase, HotfixBase, SupportBase, IntegrationBase, TaggingBase, MessageTemplateBase, TagTemplateBase,
    resolveApiVersion
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

export type ConfigParams = Pick<Config, 'identifier' | 'upstreams' | 'submodules' | 'features' | 'releases' | 'hotfixes' | 'supports' | 'included' | 'excluded'> & Partial<Pick<Config, 'apiVersion' | 'featureMessageTemplate' | 'releaseMessageTemplate' | 'hotfixMessageTemplate' | 'releaseTagTemplate' | 'hotfixTagTemplate' | 'managed' | 'developVersion' | 'masterVersion' | 'tags' | 'integrations' | 'commitMessageTemplates' | 'tagTemplates' | 'masterBranchName' | 'developBranchName' | 'dependencies' | 'labels'>>;
export class Config {
    public apiVersion?: string;
    public identifier: string;
    public managed: boolean;
    public developVersion?: string;
    public masterVersion?: string;
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
    public tags: string[];
    public integrations: Integration[]
    public commitMessageTemplates: MessageTemplate[];
    public tagTemplates: TagTemplate[];
    public masterBranchName?: string;
    public developBranchName?: string;
    public dependencies: (string | Record<string, string>)[];
    public labels: Record<string, string | string[]>;

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
            excluded: value.excluded?.slice() ?? [],
            tags: value.tags?.slice() ?? [],
            integrations: value.integrations?.map(i => Integration.fromSchema(i)),
            commitMessageTemplates: value.commitMessageTemplates?.map(i => MessageTemplate.fromSchema(i)),
            tagTemplates: value.tagTemplates?.map(i => TagTemplate.fromSchema(i)),

            developVersion: value.developVersion ?? value.version,
            masterVersion: value.masterVersion ?? value.version
        });

        return config;
    }

    public static createNew() {
        return new Config({
            apiVersion: resolveApiVersion(),
            identifier: Uuid().replace(/-/g, ''),
            upstreams: [],
            submodules: [],
            features: [],
            releases: [],
            hotfixes: [],
            supports: [],
            included: [],
            excluded: [],
            tags: []
        });
    }

    public constructor(params: ConfigParams) {
        this.apiVersion = params.apiVersion;
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

        this.managed = params.managed ?? true;
        this.developVersion = params.developVersion;
        this.masterVersion = params.masterVersion;

        this.tags = params.tags ?? [];

        this.integrations = params.integrations ?? [];

        this.commitMessageTemplates = params.commitMessageTemplates ?? [];
        this.tagTemplates = params.tagTemplates ?? [];

        this.masterBranchName = params.masterBranchName;
        this.developBranchName = params.developBranchName;

        this.dependencies = params.dependencies ?? [];

        this.labels = params.labels ?? {};
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Config extends ConfigBase {}
applyMixins(Config, [ ConfigBase ]);

export type SubmoduleParams = Pick<Submodule, 'name' | 'path' | 'url'> & Partial<Pick<Submodule, 'tags' | 'labels'>>;
export class Submodule {
    public name: string;
    public path: string;
    public url?: string;
    public tags: string[];
    public labels: Record<string, string | string[]>;

    public static parse(value: unknown) {
        return this.fromSchema(ConfigSubmoduleSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigSubmoduleSchema>) {
        return new this({
            ...value,
            tags: value.tags?.slice() ?? []
        });
    }

    public constructor(params: SubmoduleParams) {
        this.name = params.name;
        this.path = params.path;
        this.url = params.url;
        this.tags = params.tags ?? [];
        this.labels = params.labels ?? {};
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Submodule extends SubmoduleBase {}
applyMixins(Submodule, [ SubmoduleBase ]);

export type FeatureParams = Pick<Feature, 'name' | 'branchName' | 'sourceSha' | 'upstream'> & Partial<Pick<Feature, 'tags' | 'version'>>;
export class Feature {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public version?: string;
    public upstream?: string;
    public tags: Tagging[];

    public static parse(value: unknown) {
        return this.fromSchema(ConfigFeatureSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigFeatureSchema>) {
        return new this({
            ...value,
            tags: value.tags?.map(t => Tagging.fromSchema(t))
        });
    }

    public constructor(params: FeatureParams) {
        this.name = params.name;
        this.branchName = params.branchName;
        this.sourceSha = params.sourceSha;
        this.version = params.version;
        this.upstream = params.upstream;
        this.tags = params.tags ?? [];
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Feature extends FeatureBase {}
applyMixins(Feature, [ FeatureBase ]);

export type ReleaseParams = Pick<Release, 'name' | 'branchName' | 'sourceSha' | 'upstream'> & Partial<Pick<Release, 'intermediate' | 'tags' | 'version'>>;
export class Release {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public version?: string;
    public upstream?: string;
    public intermediate: boolean;
    public tags: Tagging[];

    public static parse(value: unknown) {
        return this.fromSchema(ConfigReleaseSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigReleaseSchema>) {
        return new this({
            ...value,
            tags: value.tags?.map(t => Tagging.fromSchema(t))
        });
    }

    public constructor(params: ReleaseParams) {
        this.name = params.name;
        this.branchName = params.branchName;
        this.sourceSha = params.sourceSha;
        this.version = params.version;
        this.upstream = params.upstream;
        this.intermediate = params.intermediate ?? false;
        this.tags = params.tags ?? [];
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Release extends ReleaseBase {}
applyMixins(Release, [ ReleaseBase ]);

export type HotfixParams = Pick<Hotfix, 'name' | 'branchName' | 'sourceSha' | 'upstream'> & Partial<Pick<Hotfix, 'intermediate' | 'tags' | 'version'>>;
export class Hotfix {
    public name: string;
    public branchName: string;
    public sourceSha: string;
    public version?: string;
    public upstream?: string;
    public intermediate: boolean;
    public tags: Tagging[];

    public static parse(value: unknown) {
        return this.fromSchema(ConfigHotfixSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigHotfixSchema>) {
        return new this({
            ...value,
            tags: value.tags?.map(t => Tagging.fromSchema(t))
        });
    }

    public constructor(params: HotfixParams) {
        this.name = params.name;
        this.branchName = params.branchName;
        this.sourceSha = params.sourceSha;
        this.version = params.version;
        this.upstream = params.upstream;
        this.intermediate = params.intermediate ?? false;
        this.tags = params.tags ?? [];
    }

    public toJSON() {
        return this.toHash();
    }
}
export interface Hotfix extends HotfixBase {}
applyMixins(Hotfix, [ HotfixBase ]);

export type SupportParams = Pick<Support, 'name' | 'masterBranchName' | 'developBranchName' | 'sourceSha' | 'features' | 'releases' | 'hotfixes' | 'upstream'> & Partial<Pick<Support, 'developVersion' | 'masterVersion'>>;
export class Support {
    public name: string;
    public masterBranchName: string;
    public developBranchName: string;
    public sourceSha: string;
    public developVersion?: string;
    public masterVersion?: string;
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
        this.developVersion = params.developVersion;
        this.masterVersion = params.masterVersion;
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

export type IntegrationParams = Pick<Integration, 'plugin' | 'options'>;
export class Integration {
    public plugin: string;
    public options: Record<string, unknown>;

    #initialized: boolean = false;

    #parentConfig!: Config;
    public get parentConfig() {
        if (!this.#initialized)
            throw new Error('Not initialized');

        return this.#parentConfig;
    }

    public static parse(value: unknown) {
        return this.fromSchema(ConfigIntegrationSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigIntegrationSchema>) {
        return new this({
            ...value,
            options: { ...value.options }
        });
    }

    public constructor(params: IntegrationParams) {
        this.plugin = params.plugin;
        this.options = params.options;
    }

    public async register(parentConfig: Config) {
        this.#initialized = true;

        this.#parentConfig = parentConfig;
    }
}
export interface Integration extends IntegrationBase {}
applyMixins(Integration, [ IntegrationBase ]);

export type TaggingParams = Pick<Tagging, 'name' | 'annotation'>;
export class Tagging {
    public name: string;
    public annotation?: string;

    public static parse(value: unknown) {
        return this.fromSchema(ConfigTaggingSchema.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigTaggingSchema>) {
        return new this({
            ...value
        });
    }

    public constructor(params: TaggingParams) {
        this.name = params.name;
        this.annotation = params.annotation;
    }
}
export interface Tagging extends TaggingBase {}
applyMixins(Tagging, [ TaggingBase ]);

export type MessageTemplateParams = Pick<MessageTemplate, 'name' | 'message'>;
export class MessageTemplate {
    public name: string;
    public message: string;

    public static parse(value: unknown) {
        return this.fromSchema(ConfigMessageTemplate.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigMessageTemplate>) {
        return new this({
            ...value
        });
    }

    public constructor(params: MessageTemplateParams) {
        this.name = params.name;
        this.message = params.message;
    }
}
export interface MessageTemplate extends MessageTemplateBase {}
applyMixins(MessageTemplate, [ MessageTemplateBase ]);

export type TagTemplateParams = Pick<TagTemplate, 'name' | 'tag' | 'annotation'>;
export class TagTemplate {
    public name: string;
    public tag: string;
    public annotation?: string;

    public static parse(value: unknown) {
        return this.fromSchema(ConfigTagTemplate.parse(value));
    }
    public static fromSchema(value: Zod.infer<typeof ConfigTagTemplate>) {
        return new this({
            ...value
        });
    }

    public constructor(params: TagTemplateParams) {
        this.name = params.name;
        this.tag = params.tag;
        this.annotation = params.annotation;
    }
}
export interface TagTemplate extends TagTemplateBase {}
applyMixins(TagTemplate, [ TagTemplateBase ]);
