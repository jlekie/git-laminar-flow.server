import { Readable } from 'stream'

export type ConstructorParams<T, RK extends keyof T = never, OK extends keyof T = never> = Pick<T, RK> & Partial<Pick<T, OK>>;

export type RequiredKeys<T> = { [P in keyof T]-?: undefined extends T[P] ? never : P }[keyof T];
export type OptionalKeys<T> = { [P in keyof T]-?: undefined extends T[P] ? P : never }[keyof T];

export type Lazy<T> = {
    [P in RequiredKeys<T>]-?: () => Required<T>[P]
} & {
    [P in OptionalKeys<T>]+?: () => Required<T>[P]
}

export function streamToString(stream: Readable) {
    const chunks: Buffer[] = [];

    return new Promise<string>((resolve, reject) => {
        stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
        stream.on('error', err => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
}
