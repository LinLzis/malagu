import { CliContext, ConfigContext, InitContext } from '../context';
import { Module } from '../package';
import { getBackendConfig } from '../util';
const chalk = require('chalk');

export class HookExecutor {

    protected print(hookName: string, modules: Module[]) {
        if (modules.length === 0) {
            return;
        }
        console.log(chalk`\nmalagu {yellow.bold hook} - {bold ${hookName}}`);
        for (const module of modules) {
            console.log(chalk`malagu {cyan.bold hook} - ${ module.name }`);
        }
    }

    executeCliHooks(context: CliContext): Promise<any[]> {
        const modules = context.pkg.cliHookModules;
        return this.doExecuteHooks(modules, context, 'cliHooks');
    }

    executeInitHooks(context: InitContext): Promise<any[]> {
        const modules = context.pkg.initHookModules;
        return this.doExecuteHooks(modules, context, 'initHooks');
    }

    executeConfigHooks(context: ConfigContext): Promise<any[]> {
        const modules = context.pkg.configHookModules;
        return this.doExecuteHooks(modules, context, 'configHooks');
    }

    async executeHooks(context: CliContext, hookName: string): Promise<any[]> {
        const modules = context.pkg.computeModules(hookName);
        return this.doExecuteHooks(modules, context, hookName);
    }

    protected checkHooks(context: CliContext, properties: string[]): boolean {
        const config = getBackendConfig(context.cfg);
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
                return await require(path).default(context);
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

    protected async doExecuteHooks(modules: Module[], context: CliContext, hookName: string): Promise<any[]> {
        const { REGISTER_INSTANCE, register } = require('ts-node');
        // Avoid duplicate registrations
        if (!(process as any)[REGISTER_INSTANCE]) {
            register();
        }

        const result: any = [];

        for (const m of modules) {
            const properties: string[] = [];
            const { componentName } = m;
            if (componentName.startsWith('@')) {
                const [p1, p2] = componentName.split('/');
                properties.push(p1.substring(1));
                if (p2) {
                    properties.push(p2);
                }
            } else {
                properties.push(componentName);
            }
            if (properties.length > 0) {
                properties.push(hookName);
                if (this.checkHooks(context, properties)) {
                    result.push(await this.doRequire(
                        context,
                        m.path
                    ));
                }
            }
        }
        return result;
    }

}
