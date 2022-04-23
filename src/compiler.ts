import {Context, defaultContext, Utils} from "./utils";
import {Filter, FilterArgument, FilterResultCallback, Filters} from "./filters/filters";
import {Color} from "./colors";
import {CSSStyle, CSSStyleNested, CSSStyleType} from "./styles/css-style";
import {CSSStyleIntegrityError, ErrorUtils} from "./errors";
import {CSSStyleImport} from "./styles/style-import";
import {CSSStyleKeyframes} from "./styles/style-keyframes";
import {CSSStyleMediaQuery} from "./styles/style-media-query";
import {CSSStyleMozillaDocument} from "./styles/style-mozilla-document";
import {CSSStyleRule} from "./styles/style-rule";
import {CSSStyleSupports} from "./styles/style-supports";
import {ImportArgument} from "./filters/import-filter";

export interface CompilerStatistic {
    totalMerged: number
    invalidate: () => void;
}

interface FilterDeferredJob<T extends FilterArgument> {
    filter: Filter<T>
    callback: FilterResultCallback<T>
}

const CSS_STYLES = [
    CSSStyleImport,
    CSSStyleKeyframes,
    CSSStyleMediaQuery,
    CSSStyleMozillaDocument,
    CSSStyleRule,
    CSSStyleSupports
]

interface CSSCompilerToStringOption {
    color: boolean
    textIndent: boolean
}

const INDENTATION_PALETTE = [ Color.MAGENTA, Color.CYAN, Color.GREEN, Color.RED, Color.YELLOW ];

export class CSSCompiler {

    private context: Context;
    private readonly filters: Filters;

    constructor() {
        this.context = defaultContext('', 0);
        this.filters = Filters.defaults();
    }

    getPaletteByIndent(indent: number): Color {
        return INDENTATION_PALETTE[indent % INDENTATION_PALETTE.length];
    }

    interpret(inputs: string): CSSStyle | undefined {
        let stacks: CSSStyle[] = [];
        let root = new CSSStyleNested(CSSStyleType.ROOT);
        let ctx = this.context = defaultContext(inputs, inputs.length);
        let kill = false;

        let walkThrough = false;
        let ops = undefined;

        while(!kill) {
            const char = inputs.charAt(ctx.index);
            ctx.char = char;

            if(char === '\n') {
                ctx.lineNumber++;
            }

            if(char === '\'' || char === '"') {
                if(walkThrough) {
                    if(ops === char) {
                        ops = undefined;
                        walkThrough = false;
                    }
                } else {
                    ops = char;
                    walkThrough = true;
                }
            }

            let queues: FilterDeferredJob<any>[] = [];
            let filtered = false;
            for(const filter of this.filters.getFilters()) {
                const value = filter.callback(filter, ctx);
                if(typeof value === 'boolean') {
                    kill = true;
                    break;
                } else {
                    const { enqueue, callback } = value;
                    if(enqueue) {
                        queues.push({
                            filter: filter,
                            callback: callback
                        });
                    }
                }

                if(filter.enabled) {
                    filtered = true;
                }
            }

            if(kill) {
                break;
            }
            if(!filtered) {
                if(char === '{' && !walkThrough) {
                    if(!ctx.bracketAllowed) {
                        ErrorUtils.fatalErrorDefaults(inputs, ctx.index, 'Parentheses have not closed properly at nearby');
                        kill = true;
                        break;
                    }
                    ctx.brackets++;

                    let buffer = Utils.strip(ctx.buffer);

                    for(const constructor of CSS_STYLES) {
                        const emptyStyle = new constructor();
                        const parsedStyle = emptyStyle.parse(ctx, buffer);
                        if(parsedStyle) {
                            stacks.push(parsedStyle);
                        }
                    }
                    ctx.buffer = '';
                } else if(char === '}' && !walkThrough) {
                    ctx.brackets--;

                    if(stacks.length === 0) {
                        ErrorUtils.fatalErrorDefaults(inputs, ctx.index, 'Fatal error (no depth) has found in the code nearby');
                        kill = true;
                        break;
                    }

                    const currentStyle = stacks.pop();
                    if(!currentStyle) {
                        ErrorUtils.fatalErrorDefaults(inputs, ctx.index, 'Fatal error (no style info) has found in the code nearby');
                        kill = true;
                        break;
                    }
                    currentStyle.enclose(ctx);
                    if(stacks.length > 0) {
                        const parent = stacks[stacks.length - 1];
                        if(parent instanceof CSSStyleNested) {
                            parent.addStyle(currentStyle);
                        }
                    } else {
                        root.addStyle(currentStyle);
                    }
                    ctx.buffer = '';
                } else {
                    ctx.buffer += char;
                }
            }

            for(let queue of queues) {
                queue.callback(queue.filter);
            }

            ctx.index++;
            if(ctx.index === ctx.length) {
                break;
            }
        }

        if(!kill && ctx.brackets > 0) {
            ErrorUtils.fatalErrorDefaults(inputs, ctx.index, 'Parentheses have not closed properly at nearby');
            kill = true;
        }
        if(!kill) {
            const importFilter = this.filters.findFilter<ImportArgument>('import');
            if(importFilter) {
                const imports = importFilter.args.imports;
                for(let location of imports) {
                    let styleImport = new CSSStyleImport();
                    root.addStyle(styleImport.parseWorkaround(location));
                }
            }
            return root;
        }
        return undefined;
    }

    getStats(): CompilerStatistic {
        return {
            totalMerged: this.context.totalMerged,
            invalidate: () => {
                this.context.totalMerged = 0;
            }
        };
    }

    logError(message: string) {
        console.error(`${Color.RED}%s${Color.RESET}`, message);
    }

    toString(styles: CSSStyle[], options: CSSCompilerToStringOption = { color: false, textIndent: false }, indent: number = 0): string {
        let buffer = '';
        let indentation = '';
        for(let i = 0; i < indent; i++) {
            indentation += '    ';
        }
        let apply = (contents: string): string => {
            if(options.color) {
                contents = `${this.getPaletteByIndent(indent)}${contents}${Color.RESET}`;
            }
            if(options.textIndent) {
                contents = indentation + contents + '\n';
            }
            return contents;
        };
        for(const rule of styles) {
            if(rule instanceof CSSStyleNested) {
                buffer += apply(`${rule.getRule()} {`);
                buffer += this.toString(rule.getStyles(), options, indent + 1);
                buffer += apply('}');
            } else if(rule instanceof CSSStyleRule) {
                buffer += apply(`${rule.getRule()} { ${rule.getRules().join(';')} }`);
            } else {
                buffer = apply(` ${rule.getRule()} `) + buffer;
            }
        }
        return buffer;
    }

    verifyStyleIntegrity(uncompressed: CSSStyleNested, compressed: CSSStyleNested, errors: CSSStyleIntegrityError[] = []) {
        const childrenReduced = uncompressed.getChildrenReduced();
        if(uncompressed.getStyles().length !== compressed.getStyles().length + childrenReduced) {
            let selectors = `${compressed.getStyles().length}`;
            if(childrenReduced > 0) {
                selectors += ` + ${childrenReduced} = ${compressed.getStyles().length + childrenReduced}`;
            }
            errors.push(new CSSStyleIntegrityError()
                .setLine(uncompressed.getLine())
                .setStyle(uncompressed)
                .setErrorMessage(`Selectors length are not identical at the line. (original: ${uncompressed.getStyles().length}, compressed: ${selectors})`));
            return;
        }
        const verify = (compressedStyle: CSSStyleNested, uncompressedStyle: CSSStyleNested) => {
            if(uncompressedStyle.getType() !== compressedStyle.getType()) {
                const originalName = uncompressedStyle.constructor.name;
                const compressedName = compressedStyle.constructor.name;
                errors.push(new CSSStyleIntegrityError()
                    .setLine(uncompressedStyle.getLine())
                    .setStyle(uncompressedStyle)
                    .setErrorMessage(`Style types are not identical. (original: ${uncompressedStyle.getType()} (${originalName}), compressed: ${compressedStyle.getType()} (${compressedName}))`));
                return;
            }
            if(uncompressedStyle.compare(errors, compressedStyle)) {
                this.verifyStyleIntegrity(uncompressedStyle, compressedStyle, errors);
            }
        }
        for(let i = 0; i < compressed.getStyles().length; i++) {
            const compressedStyle = compressed.getStyles()[i];
            if(!(compressedStyle instanceof CSSStyleNested)) {
                continue;
            }
            const indices = compressed.getDecompressedSelectorIndices();
            for(let j = 0; j < indices.length; j++) {
                const uncompressedStyle = uncompressed.getStyles()[indices[j]];
                if(!(uncompressedStyle instanceof CSSStyleNested)) {
                    continue;
                }
                verify(compressedStyle, uncompressedStyle);
            }
        }
    }
}