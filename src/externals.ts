import chalk from "chalk";
import cp from "child_process";

import { extensionFromLanguage, languageFromCommand, withTmpFile } from "./utils.js";

export const glowUp = async (content: string) =>
    withTmpFile(content, { extension: "md" })(async (filePath) => {
        try {
            await new Promise<void>(async (resolve, reject) => {
                const proc = cp.spawn("glow", [filePath], { stdio: "inherit" });
                proc.on("close", () => resolve());
                proc.on("error", (err) => {
                    reject(err);
                });
            });
        } catch (e) {
            console.error(chalk.yellow("Failed to run glow. Please install it with `brew install glow`\n"));
            console.log(content + "\n");
        }
    });

export const inlineExecute = async (command: string, args: string[]) => {
    return new Promise<string>(async (resolve, reject) => {
        const proc = cp.spawn(command, args, { stdio: "pipe" });
        let data = Buffer.from([]);

        proc.stdout.on("data", (chunk) => {
            process.stdout.write(chunk);
            data = Buffer.concat([data, chunk]);
        });

        proc.stderr.on("data", (chunk) => {
            process.stderr.write(chunk);
            data = Buffer.concat([data, chunk]);
        });

        proc.on("close", () => resolve(data.toString("utf-8")));
        proc.on("error", (err) => {
            reject(err);
        });
    });
};

export const executeScript = (command: string, content: string, fileName?: string) =>
    withTmpFile(content, { extension: extensionFromLanguage(languageFromCommand(command)), fileName })(
        async (filePath) => {
            const commandsAs = command.split(/\s+/g);
            const commandName = commandsAs[0];

            const args = commandsAs.slice(1).concat([filePath]);

            return await inlineExecute(commandName, args);
        },
    );
