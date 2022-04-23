import {CSSStyle, CSSStyleType} from "./css-style";
import {Utils, Context} from "../utils";

export type CSSStyleOrString = CSSStyle | string;
export class CSSStyleRule extends CSSStyle {

    private rules: CSSStyleOrString[] = [];
    private selectorTexts: string[] = [];

    constructor() {
        super(CSSStyleType.RULE);
    }

    toString(): string {
        return `${this.selectorTexts} { [${this.rules.length} css rules inside] }`;
    }

    getSelectorTexts(): string[] {
        return this.selectorTexts;
    }

    setSelectorTexts(selectorTexts: string[]) {
        this.selectorTexts = selectorTexts;
    }

    getRules(): CSSStyleOrString[] {
        return this.rules;
    }

    setRules(rules: CSSStyleOrString[]) {
        this.rules = rules;
    }

    getRule(): string {
        return this.selectorTexts.join(',');
    }

    sortSelectorTexts() {
        this.selectorTexts.sort();
    }

    setRule(newRule: string | object) {
        if(typeof newRule === 'string') {
            this.selectorTexts = Utils.splitRules(newRule, ',');
        } else {
            // TODO: The type is still ambiguous
            // this.selectorTexts = newRule;
        }
    }

    parse(ctx: Context, buffer: string): CSSStyle | undefined {
        if(!buffer.startsWith('@')) {
            const selectorTexts = Utils.splitRules(Utils.strip(ctx.buffer), ',');
            for(let selectorText of selectorTexts) {
                this.selectorTexts.push(Utils.strip(selectorText));
            }
            this.line = ctx.lineNumber;

            ctx.bracketAllowed = false;
            return this;
        }
        return undefined;
    }

    enclose(ctx: Context) {
        let rules = Utils.splitRules(Utils.strip(ctx.buffer), ';');
        for(let rule of rules) {
            if(rule.length === 0) {
                continue;
            }
            this.rules.push(Utils.strip(rule));
        }
        ctx.bracketAllowed = true;
    }

}