import { DevType } from './declare';
import { BuildCommand } from './cli/build';
import { InitCommand } from './cli/init';
import { InstallCommand } from './cli/install';
import { NewCommand } from './cli/new';
import { DevCommand } from './cli/dev';
import { PublishCommand } from './cli/publish';
import { UpdateCommand } from './cli/update';
export { BuildCommand, InitCommand, InstallCommand, NewCommand, DevCommand, PublishCommand, UpdateCommand, DevType };
declare const _default: {
    name: string;
    alias: string;
    usage: string;
    description: string;
    options: string[][];
    on: {
        '--help': () => void;
    };
    action(name: string, options: NewCommand.Options): Promise<void>;
}[];
export default _default;
