import {Utils, Context} from "../utils";
import {CSSStyleIntegrityError} from "../errors";
import {CSSStyleRule} from "./style-rule";
import {CSSStyleMediaQuery} from "./style-media-query";
import {CSSStyleImport} from "./style-import";
import {CSSStyleMozillaDocument} from "./style-mozilla-document";
import {CSSStyleSupports} from "./style-supports";
import {CSSStyleKeyframes} from "./style-keyframes";

export const enum CSSStyleType {
    ROOT = 0,
    RULE = 1,
    MEDIA = 2,
    IMPORT = 3,
    MOZILLA_DOCUMENT = 4,
    SUPPORTS = 5,
    KEYFRAMES = 6
}

export const STYLE_TO_TYPE = {
    [CSSStyleType.ROOT]: undefined,
    [CSSStyleType.RULE]: CSSStyleRule,
    [CSSStyleType.MEDIA]: CSSStyleMediaQuery,
    [CSSStyleType.IMPORT]: CSSStyleImport,
    [CSSStyleType.MOZILLA_DOCUMENT]: CSSStyleMozillaDocument,
    [CSSStyleType.SUPPORTS]: CSSStyleSupports,
    [CSSStyleType.KEYFRAMES]: CSSStyleKeyframes
};

export class CSSStyle {

    protected readonly styleType: CSSStyleType;
    protected line: number = 0;
    protected decompressedSelectorIndices: number[] = [];

    constructor(styleType: CSSStyleType) {
        this.styleType = styleType;
    }

    setDecompressedSelectorIndices(indices: number[]) {
        this.decompressedSelectorIndices = indices;
    }

    getDecompressedSelectorIndices() {
        return this.decompressedSelectorIndices;
    }

    getLine() {
        return this.line;
    }

    setLine(num: number) {
        this.line = num;
    }

    getType(): CSSStyleType {
        return this.styleType;
    }

    toString(): string {
        return '<not implemented>';
    }

    getRule(): string {
        return '<not implemented>';
    }

    setRule(newRule: string | object) {
    }

    compare(errors: CSSStyleIntegrityError[], compressed: CSSStyle): boolean {
        return false;
    }

    parse(ctx: Context, buffer: string): CSSStyle | undefined {
        return undefined;
    }

    enclose(ctx: Context) {
    }

}

export class CSSStyleNested extends CSSStyle {

    protected styles: CSSStyle[] = [];
    protected childrenReduced = 0;

    addStyle(style: CSSStyle) {
        this.styles.push(style);
    }

    getStyles(): CSSStyle[] {
        return this.styles;
    }

    increaseChildrenReduced(num: number) {
        this.childrenReduced += num;
    }

    getChildrenReduced() {
        return this.childrenReduced;
    }

    sortStyles() {
        this.styles.sort((a, b) => a.getRule().localeCompare(b.getRule()));
    }

}