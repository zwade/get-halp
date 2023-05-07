import fetch from "node-fetch";

import { ExtractedFile, FileCache } from "./file-cache.js";
import { formatFileMd, languageFromCommand, tabChomp } from "./utils.js";

export type Role = "system" | "user" | "assistant";
export type Message = { role: Role; content: string };

export type GptResponse = {
    id: string;
    object: "chat.completion";
    created: number;
    model: string;
    usage: {
        prompt_tokens: string;
        completion_tokens: string;
        total_tokens: string;
    };
    choices: {
        message: {
            role: Role;
            content: string;
        };
        finish_reason: string;
        index: string;
    }[];
};

export class ConversationManager {
    private messages: Message[] = [];
    private bearerToken: string;

    public constructor(token: string) {
        this.bearerToken = token;
    }

    public writeMessage(role: Role, content: string) {
        this.messages.push({ role, content });
    }

    public writeFile(path: string | undefined, content: string) {
        const type = path?.split(".").slice(-1)[0];
        const file = { content, type, name: path };

        this.messages.push({
            role: "system",
            content: tabChomp`
                User sent file:
                ${formatFileMd(file)}
            `,
        });

        FileCache.addScript(file);
    }

    public writeInlineCommand(command: string, result: string) {
        const [initialCommand, ...args] = command.split(/s+/g);
        const type = languageFromCommand(initialCommand);
        const content = args.join(" ");

        FileCache.addScript({ content, type });
        this.messages.push({
            role: "system",
            content: `User executed command: \`${command}\`\nCommand returned:\n\`\`\`${result}\n\`\`\``,
        });
    }

    public writeCommand(command: string, file: ExtractedFile, result: string) {
        FileCache.addScript(file);

        this.messages.push({
            role: "system",
            content: tabChomp`
            User executed command: \`${command}\`
            With script:
            ${formatFileMd(file)}
            Command returned:
            \`\`\`
            ${result}
            \`\`\``,
        });
    }

    public extractScripts(message: Message) {
        const matcher = /```(.*)\n(((?!```)[\s\S\n])*)```/g;

        let match: RegExpExecArray | null;
        while (((match = matcher.exec(message.content)), match !== null)) {
            const annotation = match[1]?.split(":");
            const type = annotation?.[0] || undefined;
            const name = annotation?.[1] || undefined;

            FileCache.addScript({ type, name, content: match[2] });
        }
    }

    public async flushMessages() {
        const result = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.bearerToken}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: this.messages,
            }),
        });

        const response = (await result.json()) as GptResponse;
        this.messages.push(response.choices[0].message);

        this.extractScripts(response.choices[0].message);
        return response.choices[0].message.content;
    }
}
