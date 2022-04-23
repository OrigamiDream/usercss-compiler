import {CSSStyle, CSSStyleType} from "./css-style";
import {CSSStyleIntegrityError} from "../errors";
import {Context, Utils} from "../utils";
import {ImportLocation} from "../filters/import-filter";

export class CSSStyleImport extends CSSStyle {

    private importText = '';

    constructor() {
        super(CSSStyleType.IMPORT);
    }

    toString(): string {
        return `${this.importText}`;
    }

    getRule(): string {
        return this.importText;
    }

    setRule(newRule: string) {
        this.importText = newRule;
    }

    compare(errors: CSSStyleIntegrityError[], compressed: CSSStyleImport): boolean {
        const lhs = this.importText;
        const rhs = compressed.importText;
        if(Utils.strip(lhs) !== Utils.strip(rhs)) {
            errors.push(new CSSStyleIntegrityError()
                .setLine(this.line)
                .setStyle(this)
                .setErrorMessage(`Import rules are not identical. (original: ${lhs}, compressed: ${rhs})`));
        }
        // Import rules does not have inner styles
        return false;
    }

    parse(ctx: Context, buffer: string): CSSStyle | undefined {
        return undefined;
    }

    parseWorkaround(location: ImportLocation): CSSStyleImport {
        this.importText = location.line;
        this.line = location.lineNumber;
        return this;
    }

}