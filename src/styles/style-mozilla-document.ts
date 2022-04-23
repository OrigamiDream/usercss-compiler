import {CSSStyle, CSSStyleNested, CSSStyleType} from "./css-style";
import {CSSStyleIntegrityError} from "../errors";
import {Context, Utils} from "../utils";

export class CSSStyleMozillaDocument extends CSSStyleNested {

    private documentText = '';

    constructor() {
        super(CSSStyleType.MOZILLA_DOCUMENT);
    }

    toString(): string {
        return `${this.documentText} { [${this.styles.length} selectors or queries inside] }`;
    }

    getRule(): string {
        return this.documentText;
    }

    setRule(newRule: string) {
        this.documentText = newRule;
    }

    compare(errors: CSSStyleIntegrityError[], compressed: CSSStyleMozillaDocument): boolean {
        const lhs = this.documentText;
        const rhs = compressed.documentText;
        if(Utils.strip(lhs) !== Utils.strip(rhs)) {
            errors.push(new CSSStyleIntegrityError()
                .setLine(this.line)
                .setStyle(this)
                .setErrorMessage(`Mozilla documents URL selectors are not identical. (original: ${lhs}, compressed: ${rhs})`));
            return false;
        }
        return true;
    }

    parse(ctx: Context, buffer: string): CSSStyle | undefined {
        if(buffer.startsWith('@-moz-document')) {
            this.line = ctx.lineNumber;
            this.documentText = buffer;
            return this;
        }
        return undefined;
    }

}