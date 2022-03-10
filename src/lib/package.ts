import * as Path from 'path';
import * as FS from 'fs-extra';

import * as Zod from 'zod';

export const PackageSchema = Zod.object({
    name: Zod.string(),
    version: Zod.string(),
    config: Zod.record(Zod.unknown()).default({})
});

export const PACKAGE_PATH = Path.resolve(__dirname, '../../package.json');

let cachedNpmPackage: Zod.infer<typeof PackageSchema>;
export async function loadNpmPackage() {
    return cachedNpmPackage || (async () => {
        const hash = await FS.readJson(PACKAGE_PATH);
        cachedNpmPackage = PackageSchema.parse(hash);

        return cachedNpmPackage;
    })();
}