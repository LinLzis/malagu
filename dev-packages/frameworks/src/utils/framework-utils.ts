import { Framework, FrameworkDetectionItem, DiskDetectorFilesystem, DetectorFilesystem } from '../detector';

export namespace FrameworkUtils {
    export async function detect(frameworks: Framework[], fs: DetectorFilesystem = new DiskDetectorFilesystem()): Promise<Framework | undefined> {
        for (const framework of frameworks) {
            if (await matches(framework, fs)) {
                return framework;
            }
        }
    }

    export async function matches(framework: Framework, fs: DetectorFilesystem = new DiskDetectorFilesystem()) {
        const { detectors } = framework;

        if (!detectors) {
            return false;
        }

        const { every, some } = detectors;

        if (every !== undefined && !Array.isArray(every)) {
            return false;
        }

        if (some !== undefined && !Array.isArray(some)) {
            return false;
        }

        const check = async ({ path, matchContent }: FrameworkDetectionItem) => {
            if (!path) {
                return false;
            }

            if ((await fs.hasPath(path)) === false) {
                return false;
            }

            if (matchContent) {
                if ((await fs.isFile(path)) === false) {
                    return false;
                }

                const regex = new RegExp(matchContent, 'gm');
                const content = await fs.readFile(path);

                if (!regex.test(content.toString())) {
                    return false;
                }
            }

            return true;
        };

        const result: boolean[] = [];

        if (every) {
            const everyResult = await Promise.all(every.map(item => check(item)));
            result.push(...everyResult);
        }

        if (some) {
            let someResult = false;

            for (const item of some) {
                if (await check(item)) {
                    someResult = true;
                    break;
                }
            }

            result.push(someResult);
        }

        return result.every(res => res === true);
    }

}

