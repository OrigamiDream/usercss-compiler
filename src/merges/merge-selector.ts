import {StyleMerge} from "./style-merge";
import {Context, Utils} from "../utils";
import {CSSStyle, CSSStyleNested} from "../styles/css-style";
import {CSSStyleOrString, CSSStyleRule} from "../styles/style-rule";

interface SelectorInfo {
    reduced: number,
    selectorTexts: string[]
    originalIndices: number[]
}

export class MergeSelector implements StyleMerge {

    merge(ctx: Context, parent: CSSStyle, styles: CSSStyleOrString[]): void {
        let ruleList: { [key: string]: SelectorInfo } = {};
        for(let i = 0; i < styles.length; i++) {
            let rule = styles[i];
            if(rule instanceof CSSStyleRule) {
                rule.getRules().sort().reverse();

                const key = rule.getRules().join(';');
                if(typeof ruleList[key] === 'undefined') {
                    ruleList[key] = {
                        reduced: 0,
                        selectorTexts: rule.getSelectorTexts(),
                        originalIndices: [i]
                    };
                } else {
                    const temp = ruleList[key];
                    ruleList[key] = {
                        reduced: temp.reduced + 1,
                        selectorTexts: temp.selectorTexts.concat(rule.getSelectorTexts()),
                        originalIndices: temp.originalIndices.concat([i])
                    };
                    ctx.totalMerged += rule.getSelectorTexts().length;
                }
            } else if(rule instanceof CSSStyle) {
                let style = new (Object.getPrototypeOf(rule).constructor());
                style.setRule(rule.getRule());
                style.setDecompressedSelectorIndices([i]);
                if(rule instanceof CSSStyleNested) {
                    this.merge(ctx, style, rule.getStyles());
                }
                if(parent instanceof CSSStyleNested) {
                    parent.addStyle(style);
                }
            }
        }

        for(let key in ruleList) {
            const info = ruleList[key];

            const rule = new CSSStyleRule();
            rule.setSelectorTexts(info.selectorTexts);
            rule.setRules(Utils.splitRules(key, ';'));
            rule.setDecompressedSelectorIndices(info.originalIndices);

            if(parent instanceof CSSStyleNested) {
                parent.increaseChildrenReduced(info.reduced);
                parent.addStyle(rule);
            }
        }

        if(parent instanceof CSSStyleNested) {
            parent.sortStyles();
        }
    }

}