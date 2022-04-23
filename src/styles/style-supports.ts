import {CSSStyle, CSSStyleNested, CSSStyleType} from "./css-style";
import {CSSStyleIntegrityError} from "../errors";
import {Context, Utils} from "../utils";

export class CSSStyleSupports extends CSSStyleNested {

    private supportsText = '';

    constructor() {
        super(CSSStyleType.SUPPORTS);
    }

    toString(): string {
        return `${this.supportsText} { [${this.styles.length} selectors or queries inside] }`;
    }

    getRule(): string {
        return this.supportsText;
    }

    setRule(newRule: string) {
        this.supportsText = newRule;
    }

    compare(errors: CSSStyleIntegrityError[], compressed: CSSStyleSupports): boolean {
        const lhs = this.supportsText;
        const rhs = compressed.supportsText;
        if(Utils.strip(lhs) !== Utils.strip(rhs)) {
            errors.push(new CSSStyleIntegrityError()
                .setLine(this.line)
                .setStyle(this)
                .setErrorMessage(`Supports rules are not identical. (original: ${lhs}, compressed: ${rhs})`));
            return false;
        }
        return true;
    }

    parse(ctx: Context, buffer: string): CSSStyle | undefined {
        if(buffer.startsWith('@supports')) {
            this.line = ctx.lineNumber;
            this.supportsText = buffer;
            return this;
        }
        return undefined;
    }
}