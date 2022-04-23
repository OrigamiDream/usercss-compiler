import {StyleMerge} from "./style-merge";
import {CSSStyle, CSSStyleNested, CSSStyleType, STYLE_TO_TYPE} from "../styles/css-style";
import {CSSStyleImport} from "../styles/style-import";
import {CSSStyleOrString, CSSStyleRule} from "../styles/style-rule";
import {Context} from "../utils";

interface RuleInfo {
    reduced: number
    type: CSSStyleType
    values: CSSStyleOrString[]
    originalIndices: number[]
}

class MergeRule implements StyleMerge {

    merge(ctx: Context, parent: CSSStyle, styles: CSSStyleOrString[]): void {
        let selectorList: { [key: string]: RuleInfo } = {};
        for(let i = 0; i < styles.length; i++) {
            const rule = styles[i];
            if(typeof rule === 'string') {
                continue;
            }
            if(rule.getType() === CSSStyleType.IMPORT) {
                let style = new CSSStyleImport();
                style.setRule(rule.getRule());
                style.setDecompressedSelectorIndices([i]);
                style.setLine(rule.getLine());
                if(parent instanceof CSSStyleNested) {
                    parent.addStyle(style);
                }
                continue;
            }

            let nextStyles: CSSStyleOrString[] = [];
            if(rule instanceof CSSStyleRule) {
                rule.sortSelectorTexts();

                nextStyles = rule.getRules();
            } else if(rule instanceof CSSStyleNested) {
                nextStyles = rule.getStyles();
            }

            const key = rule.getRule();
            if(typeof selectorList[key] === 'undefined') {
                selectorList[key] = {
                    reduced: 0,
                    type: rule.getType(),
                    values: nextStyles,
                    originalIndices: [i]
                }
            } else {
                const cache = selectorList[key];
                cache.reduced++;
                cache.values = cache.values.concat(nextStyles);
                cache.originalIndices = cache.originalIndices.concat([i]);
                ctx.totalMerged += nextStyles.length;
            }
        }

        for(const key in selectorList) {
            const info = selectorList[key];

            let rule;
            if(info.type == CSSStyleType.RULE) {
                rule = new CSSStyleRule()
                rule.setRules(info.values);
            } else {
                const styleType = STYLE_TO_TYPE[info.type];
                if(styleType) {
                    rule = new styleType();
                    this.merge(ctx, rule, info.values);
                } else {
                    throw new Error(`Type ${info.type} does not have corresponding constructor`);
                }
            }
            rule.setRule(key);
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
