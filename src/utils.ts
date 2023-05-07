import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

import type { ExtractedFile } from "./file-cache.js";

export const withTmpFile =
    (content: string, opts: { extension?: string; fileName?: string }) =>
    async <T>(fn: (filePath: string) => Promise<T> | T) => {
        const dirName = os.tmpdir();
        const fileName =
            opts.fileName ??
            `halp-${Math.floor(Math.random() * 100000000)}${opts.extension ? "." + opts.extension : ""}`;
        const filePath = path.join(dirName, fileName);

        await fs.writeFile(filePath, content);

        try {
            return await fn(filePath);
        } finally {
            await fs.unlink(filePath);
        }
    };

export const pathType = async (p: string) => {
    try {
        const stat = await fs.stat(p);
        if (stat.isFile()) {
            return "file";
        }

        if (stat.isDirectory()) {
            return "directory";
        }

        return undefined;
    } catch (e) {
        return undefined;
    }
};

export const getDirectoryAndFilter = async (p: string) => {
    const type = await pathType(p);
    if (type === "directory") {
        return { directory: p, filter: "" };
    }

    return {
        directory: path.dirname(p),
        filter: path.basename(p),
    };
};

export const getAvailableFiles = async (directory: string, filter: string) => {
    const files = await fs.readdir(directory);
    return files
        .filter((f) => f.startsWith(filter))
        .sort((a, b) => a.localeCompare(b))
        .map((f) => getRelativePath(path.join(directory, f)));
};

const getRelativePath = (p: string) => {
    const workingDir = process.cwd();
    const relativePath = path.relative(workingDir, p);
    if (relativePath.startsWith("..")) {
        return path.normalize(p);
    }

    return relativePath;
};

export const formatFile = (f: ExtractedFile) => {
    const message = f.name ?? `${f.content.split("\n")[0]} ...`;

    if (f.type) {
        return `(${f.type}) ${message}`;
    }

    return message;
};

export const commandFromLanguage = (language?: string) => {
    switch (language?.toLowerCase().trim()) {
        case "python":
        case "py":
            return "python3";
        case "javascript":
        case "js":
            return "node";
        case "typescript":
        case "ts":
            return "ts-node";
        case "bash":
        case "shell":
            return "bash";
        default:
            return undefined;
    }
};

export const languageFromCommand = (command: string) => {
    switch (command) {
        case "python3":
        case "python":
            return "python";
        case "node":
            return "javascript";
        case "ts-node":
            return "typescript";
        case "bash":
            return "bash";
        default:
            return undefined;
    }
};

export const extensionFromLanguage = (language?: string) => {
    switch (language?.toLowerCase().trim()) {
        case "python":
            return "py";
        case "javascript":
        case "js":
            return "js";
        case "typescript":
        case "ts":
            return "ts";
        case "bash":
        case "shell":
            return "sh";
        default:
            return undefined;
    }
};

export const tabChomp = (stringParts: TemplateStringsArray, ...values: string[]) => {
    const result = [...stringParts].reduce((acc, part, i) => {
        const value = values[i];
        return acc + part + (value ?? "");
    }, "");

    const lines = result.split("\n");
    return lines
        .map((l) => l.trimStart())
        .filter((l) => !!l)
        .join("\n")
        .trim();
};

export const formatFileMd = (file: ExtractedFile) => {
    let header = file.type?.trim() ?? "";
    if (file.name) {
        header += `:${file.name.trim()}`;
    }

    return tabChomp`
        \`\`\`${header}
        ${file.content}
        \`\`\`
    `;
};
