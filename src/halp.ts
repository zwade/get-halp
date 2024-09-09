#!/usr/bin/env node

import "./evils/patch-inquirer-autocomplete.js";

import chalk from "chalk";
import fs from "fs/promises";

import { Config, updateConfig } from "./config.js";
import { ConversationManager } from "./conversation-manager.js";
import { executeScript, glowUp, inlineExecute } from "./externals.js";
import { ExtractedFile } from "./file-cache.js";
import { Prompt } from "./prompter.js";
import { languageFromCommand, tabChomp } from "./utils.js";

const prompt = new Prompt();
const baseConfig = await Config.loadConfig();
const config = await updateConfig(baseConfig, prompt);
config.serialize();

const conversation = new ConversationManager(config.configData.openai.token);

conversation.writeMessage(
    "system",
    tabChomp`
        You are a debugging client embedded into the terminal.
        You can ask questions, execute code, and save files.

        Here are some additional instructions:
        1. Please ensure all code is properly listed with it's file type.
        2. You may optionally give code blocks a name in addition to their type.
           For example, here is a javascript file with the name foo.js:
           \`\`\`js:foo.js
           console.log("Hello world!");
           \`\`\`
        3. When suggesting changes, please print the full file with the change.
    `,
);

while (true) {
    const res = await prompt.prompt();

    switch (res.kind) {
        case "file": {
            conversation.writeFile(res.fileName, res.fileContent);
            break;
        }
        case "question": {
            conversation.writeMessage("user", res.question);
            const result = await conversation.flushMessages();
            await glowUp(result);
            break;
        }
        case "save": {
            const fileToSave = await prompt.chooseWhatToSave();

            if (fileToSave) {
                const fileName = await prompt.promptFileName("Save file as:");
                await fs.writeFile(fileName, fileToSave.content);
                console.log(chalk.green(`Saved file as ${fileName}`));
            }

            break;
        }
        case "execute": {
            const fileToExecute = await prompt.chooseWhatToExecute();
            const { command, content } = await prompt.getFileToExecute(fileToExecute);
            const result = await executeScript(command, content, fileToExecute?.name);

            const file: ExtractedFile = { content, name: fileToExecute?.name, type: languageFromCommand(command) };
            conversation.writeCommand(command, file, result);

            break;
        }
        case "execute-inline": {
            const commandString = res.shellArgs.join(" ");
            const result = await inlineExecute("bash", ["-c", commandString]);

            conversation.writeInlineCommand(commandString, result);

            break;
        }
        case "edit": {
            const fileToEdit = await prompt.chooseWhatToEdit();
            const file = await prompt.editFile(fileToEdit);

            conversation.writeFile(fileToEdit?.name, file);
            break;
        }
        case "exit": {
            process.exit(0);
        }
    }
}
