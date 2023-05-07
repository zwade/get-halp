export type ExtractedFile = { type?: string; name?: string; content: string };

class _FileCache {
    #scripts: ExtractedFile[] = [];

    public get scripts() {
        return this.#scripts;
    }

    public async addScript(file: ExtractedFile) {
        const existingIndex = this.#scripts.findIndex((f) => f.content === file.content);
        if (existingIndex >= 0) {
            const existing = this.#scripts[existingIndex];
            const newlyAdded: ExtractedFile = {
                content: file.content,
                type: existing.type ?? file.type,
                name: existing.name ?? file.name,
            };

            this.#scripts.splice(existingIndex, 1);
            this.#scripts.unshift(newlyAdded);
        } else {
            this.#scripts.unshift(file);
        }
    }
}

export const FileCache = new _FileCache();
