// eslint-disable-next-line
// @ts-nocheck
import enquirer from "inquirer";
import Autocomplete from "inquirer-autocomplete-prompt";

const patchPromptSubclass = (cls, onStart = () => {}) => {
    const oldRun = cls.prototype._run;
    cls.prototype._run = function (cb) {
        oldRun.apply(this, [cb]);

        if (this.opt.startValue) {
            this.rl.write(this.opt.startValue);
            this.render();
            onStart(this, this.opt.startValue);
        }
    };
};

patchPromptSubclass(Autocomplete, (self, startValue) => self.search(startValue));
patchPromptSubclass(enquirer.prompt.prompts.input);
