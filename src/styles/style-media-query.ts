import {CSSStyle, CSSStyleNested, CSSStyleType} from "./css-style";
import {Context, Utils} from "../utils";
import {CSSStyleIntegrityError} from "../errors";

export class CSSStyleMediaQuery extends CSSStyleNested {

    private mediaRuleText = '';

    constructor() {
        super(CSSStyleType.MEDIA);
    }

    toString(): string {
        return `${this.mediaRuleText} { [${this.styles.length} selectors inside] }`;
    }

    getRule(): string {
        return this.mediaRuleText;
    }

    setRule(newRule: string) {
        this.mediaRuleText = newRule;
    }

    compare(errors: CSSStyleIntegrityError[], compressed: CSSStyleMediaQuery): boolean {
        const lhs = this.mediaRuleText;
        const rhs = compressed.mediaRuleText;
        if(Utils.strip(lhs) !== Utils.strip(rhs)) {
            errors.push(new CSSStyleIntegrityError()
                .setLine(this.line)
                .setStyle(this)
                .setErrorMessage(`Media query rules are not identical. (original: ${lhs}, compressed: ${rhs})`));
            return false;
        }
        return true;
    }

    parse(ctx: Context, buffer: string): CSSStyle | undefined {
        if(buffer.startsWith('@media')) {
            this.line = ctx.lineNumber;
            this.mediaRuleText = buffer;
            return this;
        }
        return undefined;
    }

}