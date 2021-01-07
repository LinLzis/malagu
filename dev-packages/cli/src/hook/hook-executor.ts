import { ServeContext, InitContext, BuildContext, DeployContext, WebpackContext, CliContext, ConfigContext } from '../context';
import { resolve } from 'path';
import { getConfig } from '../webpack/utils';
import { BACKEND_TARGET } from '../constants';
const chalk = require('chalk');

export class HookExecutor {

    async executeCliHooks(context: CliContext): Promise<void> {
        const modules = context.pkg.cliHookModules;
        await this.doExecuteHooks(modules, context, 'cliHooks');
    }

    async executeInitHooks(context: InitContext): Promise<void> {
        const modules = context.pkg.initHookModules;
        await this.doExecuteHooks(modules, context, 'initHooks');
    }

    async executeConfigHooks(context: ConfigContext): Promise<void> {
        const modules = context.pkg.configHookModules;
        await this.doExecuteHooks(modules, context, 'configHooks');
    }

    async executeBuildHooks(context: BuildContext): Promise<void> {
        const modules = context.pkg.buildHookModules;
        await this.doExecuteHooks(modules, context, 'buildHooks');
    }

    async executeDeployHooks(context: DeployContext): Promise<void> {
        const modules = context.pkg.deployHookModules;
        await this.doExecuteHooks(modules, context, 'deployHooks');
    }

    async executeServeHooks(context: ServeContext): Promise<void> {
        const modules = context.pkg.serveHookModules;
        if (modules.size === 0) {
            console.log(chalk.yellow('Please provide the serve hook first.'));
            return;
        }
        await this.doExecuteHooks(modules, context, 'serveHooks');
    }

    async executeWebpackHooks(context: WebpackContext): Promise<void> {
        const modules = context.pkg.webpackHookModules;
        await this.doExecuteHooks(modules, context, 'webpackHooks');
    }

    async executeHooks(context: CliContext, hookName: string): Promise<void> {
        const modules = context.pkg.computeModules(hookName);
        await this.doExecuteHooks(modules, context, hookName);
    }

    protected checkHooks(context: CliContext, properties: string[]): boolean {
        const config = getConfig(context.cfg, BACKEND_TARGET);
        let current: any = config;
        for (const p of properties) {
            current = current[p];
            if (!current) {
                break;
            }
        }

        return current !== false ? true : false;
    }

    protected async doRequire(context: CliContext, ...paths: string[]) {
        let lastError: Error | undefined;
        for (const path of paths) {
            try {
                await require(path).default(context);
                return;
            } catch (error) {
                lastError = error;
                if (error && error.code === 'MODULE_NOT_FOUND') {
                    continue;
                } else {
                    throw error;
                }
            }
        }

        if (lastError) {
            throw lastError;
        }

    }

    protected async doExecuteHooks(modules: Map<string, string>, context: CliContext, hookName: string): Promise<void> {
        const { REGISTER_INSTANCE, register } = require('ts-node');
        // Avoid duplicate registrations
        if (!(process as any)[REGISTER_INSTANCE]) {
            register();
        }

        for (const m of modules.entries()) {
            const properties: string[] = [];
            const [moduleName, modulePath] = m;
            if (moduleName.startsWith('@')) {
                const [p1, p2] = moduleName.split('/');
                properties.push(p1.substring(1));
                if (p2) {
                    properties.push(p2.substring(0, p2.lastIndexOf('@')));
                }
            } else {
                properties.push(moduleName.substring(0, moduleName.lastIndexOf('@')));
            }
            if (properties.length > 0) {
                properties.push(hookName);
                if (this.checkHooks(context, properties)) {
                    await this.doRequire(
                        context,
                        resolve(context.pkg.projectPath, 'node_modules', modulePath),
                        resolve(context.pkg.projectPath, '..', 'node_modules', modulePath),
                        resolve(context.pkg.projectPath, '..', '..', 'node_modules', modulePath),
                        modulePath
                    );
                }
            }
        }
    }
}
