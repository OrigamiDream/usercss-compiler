import {CSSStyle} from "../styles/css-style";
import {Context} from "../utils";
import {CSSStyleOrString} from "../styles/style-rule";
import {Color} from "../colors";

export type MergeFunction = (ctx: Context, parent: CSSStyle, styles: CSSStyleOrString[]) => void;
export interface StyleMerge {
    merge: MergeFunction;
}