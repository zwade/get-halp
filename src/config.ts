import fs from "fs/promises";
import os from "os";
import path from "path";

import { parse, stringify } from "@ltd/j-toml";
import { M, marshal } from "@zensors/sheriff";

import { Prompt } from "./prompter.js";

type Table = ReturnType<typeof parse>;
type DeepPartial<T> = {
    [K in keyof T]?: DeepPartial<T[K]>;
};

interface SerializedConfigData {
    openai: {
        token: string;
    };
}

const configDir = path.join(os.homedir(), ".config");
const configPath = path.join(configDir, "halp-gpt.toml");

export class Config<T extends DeepPartial<SerializedConfigData> = SerializedConfigData> {
    constructor(public configData: T) {}

    public async serialize() {
        const data = stringify({ ...this.configData });

        await fs.writeFile(configPath, data);
    }

    public static fromToml(toml: Table) {
        const t: unknown = toml;
        marshal(t, M.obj({ openai: M.opt(M.obj({ token: M.opt(M.str) })) }));

        return new Config(t);
    }

    public static async loadConfig(): Promise<Config<DeepPartial<SerializedConfigData>>> {
        try {
            await fs.mkdir(configDir, { recursive: true });
        } catch (e) {
            // pass;
        }

        try {
            const content = await fs.readFile(configPath, "utf-8");
            const config = parse(content);
            return Config.fromToml(config);
        } catch (e) {
            return new Config({});
        }
    }
}

export const updateConfig = async (
    config: Config<DeepPartial<SerializedConfigData>>,
    prompter: Prompt,
): Promise<Config<SerializedConfigData>> => {
    if (!config.configData.openai?.token) {
        let openaiKey: string | undefined;
        while (!openaiKey) {
            openaiKey = await prompter.promptPassword("Please provide an OpenAI API key to continue");
        }

        config.configData.openai ??= {};
        config.configData.openai.token = openaiKey;
    }

    return config as Config<SerializedConfigData>;
};
