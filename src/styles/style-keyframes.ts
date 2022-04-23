import {CSSStyle, CSSStyleNested, CSSStyleType} from "./css-style";
import {CSSStyleIntegrityError} from "../errors";
import {Context, Utils} from "../utils";

export class CSSStyleKeyframes extends CSSStyleNested {

    private keyframesText = '';

    constructor() {
        super(CSSStyleType.KEYFRAMES);
    }

    toString(): string {
        return `${this.keyframesText} { [${this.styles.length} selectors or queries inside}] }`;
    }

    getRule(): string {
        return this.keyframesText;
    }

    setRule(newRule: string) {
        this.keyframesText = newRule;
    }

    compare(errors: CSSStyleIntegrityError[], compressed: CSSStyleKeyframes): boolean {
        const lhs = this.keyframesText;
        const rhs = compressed.keyframesText;
        if(Utils.strip(lhs) !== Utils.strip(rhs)) {
            errors.push(new CSSStyleIntegrityError()
                .setLine(this.line)
                .setStyle(this)
                .setErrorMessage(`Keyframe animation rules are not identical. (original: ${lhs}, compressed: ${rhs})`));
            return false;
        }
        return true;
    }

    parse(ctx: Context, buffer: string): CSSStyle | undefined {
        const keywords = ['@keyframes', '@-webkit-keyframes', '@-moz-keyframes', '@-o-keyframes']
        if(keywords.filter(keyword => buffer.startsWith(keyword)).length > 0) {
            this.line = ctx.lineNumber;
            this.keyframesText = buffer;
            return this;
        }
        return undefined;
    }

}