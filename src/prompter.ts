import chalk from "chalk";
import fs from "fs/promises";
import inquirer from "inquirer";
import inquirerPrompt from "inquirer-autocomplete-prompt";
import FileTreeSelectionPrompt from "inquirer-file-tree-selection-prompt";
import path from "path";
import untildify from "untildify";

import { ExtractedFile, FileCache } from "./file-cache.js";
import { commandFromLanguage, formatFile, getAvailableFiles, getDirectoryAndFilter } from "./utils.js";

inquirer.registerPrompt("file-tree-selection", FileTreeSelectionPrompt);
inquirer.registerPrompt("autocomplete", inquirerPrompt);

type State = { kind: "initial" } | { kind: "follow-up" };

type Response =
    | { kind: "question"; question: string }
    | { kind: "file"; fileName: string; fileContent: string }
    | { kind: "exit" }
    | { kind: "save" }
    | { kind: "execute" }
    | { kind: "execute-inline"; shellArgs: string[] }
    | { kind: "edit" };

export class Prompt {
    private state: State = { kind: "initial" };

    public async prompt(): Promise<Response> {
        const message = this.state.kind === "initial" ? "What's up?" : "Anything else?";

        const result = await this.promptString(message);
        const directiveRegex = result.match(/^!([^\s]*)\s*(.*)$/);

        let response: Response | undefined;
        if (directiveRegex) {
            const directive = directiveRegex[1];
            const args = directiveRegex[2].split(" ");

            switch (directive) {
                case "file":
                    response = await this.loadFile(args[0] || undefined);
                    break;
                case "save":
                    response = { kind: "save" };
                    break;
                case "quit":
                case "exit":
                    response = { kind: "exit" };
                    break;
                case "run":
                case "execute":
                    response = { kind: "execute" };
                    break;
                case "edit":
                    response = { kind: "edit" };
                    break;
                case "!":
                    response = { kind: "execute-inline", shellArgs: args };
                    break;
                default:
                    console.log(chalk.red(`Unknown directive: ${directive}`));
            }
        } else if (result !== "") {
            response = { kind: "question", question: result };
            this.state = { kind: "follow-up" };
        }

        if (response) {
            return response;
        }

        return this.prompt();
    }

    public async chooseWhatToExecute() {
        return this.chooseFile("Which file do you want to execute?", true);
    }

    public async chooseWhatToEdit() {
        return this.chooseFile("Which file do you want to edit?", true);
    }

    public async chooseWhatToSave() {
        if (FileCache.scripts.length === 0) {
            console.log(chalk.yellow("No files to save"));
            return undefined;
        }

        return this.chooseFile("Which file do you want to save?");
    }

    public async chooseFile(prompt: string, allowNew?: false): Promise<ExtractedFile>;
    public async chooseFile(prompt: string, allowNew: true): Promise<ExtractedFile | undefined>;
    public async chooseFile(prompt: string, allowNew = false) {
        if (FileCache.scripts.length === 0) {
            return undefined;
        }

        const scripts = FileCache.scripts;
        const choices = scripts
            .map((f, i) => ({ name: formatFile(f), value: i as number | undefined }))
            .concat(allowNew ? [{ name: "New file", value: undefined }] : []);

        const result = await inquirer.prompt([
            {
                type: "list",
                message: prompt,
                name: "file",
                choices,
            },
        ]);

        const index = (result as { file: number | undefined }).file;

        if (index === undefined) {
            return undefined;
        }

        return scripts[index];
    }

    public async promptFileName(message: string) {
        const startValue: string | undefined = FileCache.scripts.filter(
            (f): f is typeof f & { name: string } => !!f.name,
        )[0]?.name;

        const file = await inquirer.prompt([
            {
                type: "autocomplete",
                message,
                name: "file",
                suggestOnly: true,
                startValue,
                source: async (_: any, input?: string) => {
                    const workingDir = process.cwd();
                    const untildifiedInput = untildify(input ?? ".");
                    const pathToSearch = path.resolve(workingDir, untildifiedInput);

                    const { directory, filter } = await getDirectoryAndFilter(pathToSearch);
                    const files = await getAvailableFiles(directory, filter);
                    return files;
                },
            },
        ]);

        const pathInput = (file as { file: string }).file;
        return pathInput;
    }

    public async getFileToExecute(file: ExtractedFile | undefined) {
        let content: string;
        if (file) {
            content = file.content;
        } else {
            const result = await inquirer.prompt([
                {
                    type: "editor",
                    message: "File content",
                    name: "content",
                },
            ]);

            content = (result as { content: string }).content;
        }

        const command = await this.promptString("Command to execute:", commandFromLanguage(file?.type));
        return { command, content };
    }

    public async editFile(file?: ExtractedFile) {
        const result = await inquirer.prompt([
            {
                type: "editor",
                message: "File content",
                name: "content",
                default: file?.content,
            },
        ]);

        return (result as { content: string }).content;
    }

    public async promptString(message: string, startValue?: string) {
        const result = await inquirer.prompt([
            {
                type: "input",
                message,
                name: "data",
                startValue,
            },
        ]);

        return (result as { data: string }).data;
    }

    public async promptPassword(prompt: string) {
        const result = await inquirer.prompt([
            {
                input: "password",
                message: prompt,
                name: "data",
            },
        ]);

        return (result as { data: string }).data;
    }

    private async loadFile(name?: string): Promise<Response | undefined> {
        try {
            const path = name ?? (await this.promptFileName("File to load:"));
            const content = await fs.readFile(path, "utf-8");

            return { kind: "file", fileName: path, fileContent: content };
        } catch (e) {
            console.log(chalk.red(`Failed to load file: ${e}`));
            return undefined;
        }
    }
}
