const CSSSTYLE_TYPE_RULE = 1;
const CSSSTYLE_TYPE_MEDIA = 2;
const CSSSTYLE_TYPE_IMPORT = 3;
const CSSSTYLE_TYPE_MOZILLA_DOCUMENT = 4;
const CSSSTYLE_TYPE_SUPPORTS = 5;
const CSSSTYLE_TYPE_KEYFRAMES = 6;

const cssStyleTypes = {
    stacks: [],
    styleTypes: {
        styleRule: {
            name: 'CSSStyleRule',
            id: CSSSTYLE_TYPE_RULE,
            constructor: function () {
                this.line = 0;
                this.type = CSSSTYLE_TYPE_RULE;
                this.selectorTexts = [];
                this.rules = [];

                this.decompressedSelectorIndices = [];

                this.toString = function () {
                    return `${this.selectorTexts} { [${this.rules.length} css rules inside] }`;
                };

                this.getRule = function() {
                    return this.selectorTexts.join(',');
                };

                this.setRule = function(newRule) {
                    if(typeof newRule === 'string') {
                        this.selectorTexts = splitter(newRule, ',');
                    } else {
                        this.selectorTexts = newRule;
                    }
                };

                this.compare = function(compressed) {
                    // Cannot verify css-rules if they are identical.
                    // Merging process zips duplicated tags into one selector.
                };
            },
            parse: function (vars, buf) {
                if (!buf.startsWith('@')) {
                    const style = new CSSStyleRule();
                    style.line = vars.lineNumber;
                    const selectorTexts = splitter(trimBuffer(vars.buffer), ',');
                    for (let selectorText of selectorTexts) {
                        style.selectorTexts.push(trimBuffer(selectorText));
                    }
                    vars.bracketAllowed = false;
                    cssStyleTypes.stacks.push({
                        style: style,
                        type: cssStyleTypes.styleTypes.styleRule
                    });
                    return true;
                }
                return false;
            },
            enclose: function(vars, style) {
                let rules = splitter(trimBuffer(vars.buffer), ';');
                for(let rule of rules) {
                    if(rule.length === 0) {
                        continue;
                    }
                    style.rules.push(trimBuffer(rule));
                }
                vars.bracketAllowed = true;
            }
        },
        mediaQuery: {
            name: 'CSSStyleMediaQuery',
            id: CSSSTYLE_TYPE_MEDIA,
            constructor: function() {
                this.line = 0;
                this.type = CSSSTYLE_TYPE_MEDIA;
                this.mediaRuleText = '';
                this.styles = [];
                this.childrenReduced = 0;

                this.decompressedSelectorIndices = [];

                this.toString = function() {
                    return `${this.mediaRuleText} { [${this.styles.length} selectors inside] }`;
                };

                this.getRule = function() {
                    return this.mediaRuleText;
                };

                this.setRule = function(newRule) {
                    this.mediaRuleText = newRule;
                };

                this.compare = function(errors, compressed) {
                    let a = this.mediaRuleText;
                    let b = compressed.mediaRuleText;
                    if(trimBuffer(a) !== trimBuffer(b)) {
                        errors.push(new CSSStyleIntegrityError().setLine(this.line).setStyle(this).setErrorMessage(`Media query rules are not identical. (original: ${a}, compressed: ${b})`));
                        return false;
                    }
                    return true;
                };
            },
            parse: function(vars, buf) {
                if(buf.startsWith('@media')) {
                    const style = new CSSStyleMediaQuery();
                    style.line = vars.lineNumber;
                    style.mediaRuleText = buf;
                    cssStyleTypes.stacks.push({
                        style: style,
                        type: cssStyleTypes.styleTypes.mediaQuery
                    });
                    return true;
                }
                return false;
            },
            enclose: function(vars, style) {
            }
        },
        mozillaDocument: {
            name: 'CSSStyleMozillaDocument',
            id: CSSSTYLE_TYPE_MOZILLA_DOCUMENT,
            constructor: function() {
                this.line = 0;
                this.type = CSSSTYLE_TYPE_MOZILLA_DOCUMENT;
                this.documentText = '';
                this.styles = [];
                this.childrenReduced = 0;

                this.decompressedSelectorIndices = [];

                this.toString = function() {
                    return `${this.documentText} { [${this.styles.length} selectors or queries inside] }`;
                };

                this.getRule = function() {
                    return this.documentText;
                };

                this.setRule = function(newRule) {
                    this.documentText = newRule;
                };

                this.compare = function(errors, compressed) {
                    let a = this.documentText;
                    let b = compressed.documentText;
                    if(trimBuffer(a) !== trimBuffer(b)) {
                        errors.push(new CSSStyleIntegrityError().setLine(this.line).setStyle(this).setErrorMessage(`Mozilla documents URL selectors are not identical. (original: ${a}, compressed: ${b})`));
                        return false;
                    }
                    return true;
                };
            },
            parse: function(vars, buf) {
                if(buf.startsWith('@-moz-document')) {
                    const style = new CSSStyleMozillaDocument();
                    style.line = vars.lineNumber;
                    style.documentText = buf;
                    cssStyleTypes.stacks.push({
                        style: style,
                        type: cssStyleTypes.styleTypes.mozillaDocument
                    });
                    return true;
                }
                return false;
            },
            enclose: function(vars, style) {
            }
        },
        supports: {
            name: 'CSSStyleSupports',
            id: CSSSTYLE_TYPE_SUPPORTS,
            constructor: function() {
                this.line = 0;
                this.type = CSSSTYLE_TYPE_SUPPORTS;
                this.supportsText = '';
                this.styles = [];
                this.childrenReduced = 0;

                this.decompressedSelectorIndices = [];

                this.toString = function() {
                    return `${this.supportsText} { [${this.styles.length} selectors or queries inside] }`;
                };

                this.getRule = function() {
                    return this.supportsText;
                };

                this.setRule = function(newRule) {
                    this.supportsText = newRule;
                };

                this.compare = function(errors, compressed) {
                    let a = this.supportsText;
                    let b = compressed.supportsText;
                    if(trimBuffer(a) !== trimBuffer(b)) {
                        errors.push(new CSSStyleIntegrityError().setLine(this.line).setStyle(this).setErrorMessage(`Supports rules are not identical. (original: ${a}, compressed: ${b})`));
                        return false;
                    }
                    return true;
                };
            },
            parse: function(vars, buf) {
                if(buf.startsWith('@supports')) {
                    const style = new CSSStyleSupports();
                    style.line = vars.lineNumber;
                    style.supportsText = buf;
                    cssStyleTypes.stacks.push({
                        style: style,
                        type: cssStyleTypes.styleTypes.supports
                    });
                    return true;
                }
                return false;
            },
            enclose: function(vars, style) {
            }
        },
        keyframes: {
            name: 'CSSStyleKeyframes',
            id: CSSSTYLE_TYPE_KEYFRAMES,
            constructor: function() {
                this.line = 0;
                this.type = CSSSTYLE_TYPE_KEYFRAMES;
                this.keyframesText = '';
                this.styles = [];
                this.childrenReduced = 0;

                this.decompressedSelectorIndices = [];

                this.toString = function() {
                    return `${this.keyframesText} { [${this.styles.length} selectors or queries inside] }`;
                };

                this.getRule = function() {
                    return this.keyframesText;
                };

                this.setRule = function(newRule) {
                    this.keyframesText = newRule;
                };

                this.compare = function(errors, compressed) {
                    let a = this.keyframesText;
                    let b = compressed.keyframesText;
                    if(trimBuffer(a) !== trimBuffer(b)) {
                        errors.push(new CSSStyleIntegrityError().setLine(this.line).setStyle(this).setErrorMessage(`Keyframe animation rules are not identical. (original: ${a}, compressed: ${b})`));
                        return false;
                    }
                    return true;
                };
            },
            parse: function(vars, buf) {
                if(buf.startsWith('@keyframes') || buf.startsWith('@-webkit-keyframes') || buf.startsWith('@-moz-keyframes') || buf.startsWith('@-o-keyframes')) {
                    const style = new CSSStyleKeyframes();
                    style.line = vars.lineNumber;
                    style.keyframesText = buf;
                    cssStyleTypes.stacks.push({
                        style: style,
                        type: cssStyleTypes.styleTypes.keyframes
                    });
                    return true;
                }
                return false;
            },
            enclose: function(vars, style) {
            }
        },
        imports: {
            name: 'CSSStyleImport',
            id: CSSSTYLE_TYPE_IMPORT,
            constructor: function() {
                this.line = 0;
                this.type = CSSSTYLE_TYPE_IMPORT;
                this.importText = '';

                this.decompressedSelectorIndices = []; // Array of Int

                this.toString = function() {
                    return `${this.importText}`;
                };

                this.getRule = function() {
                    return this.importText;
                };

                this.setRule = function(newRule) {
                    this.importText = newRule;
                };

                this.compare = function(errors, compressed) {
                    let a = this.importText;
                    let b = compressed.importText;
                    if(trimBuffer(a) !== trimBuffer(b)) {
                        errors.push(new CSSStyleIntegrityError().setLine(this.line).setStyle(this).setErrorMessage(`Import rules are not identical. (original: ${a}, compressed: ${b})`));
                    }
                    // Import rules does not have inner styles
                    return false;
                };
            },
            parse: function(vars, buf) {
                return false;
            },
            enclose: function(vars, style) {
            }
        }
    }
};

const CSSStyleRule = cssStyleTypes.styleTypes.styleRule.constructor;
const CSSStyleMediaQuery = cssStyleTypes.styleTypes.mediaQuery.constructor;
const CSSStyleMozillaDocument = cssStyleTypes.styleTypes.mozillaDocument.constructor;
const CSSStyleSupports = cssStyleTypes.styleTypes.supports.constructor;
const CSSStyleKeyframes = cssStyleTypes.styleTypes.keyframes.constructor;
const CSSStyleImport = cssStyleTypes.styleTypes.imports.constructor;

function getFriendlyCSSStyleType(styleType) {
    const structure = getStyleStructure(styleType);
    return structure != null ? structure.name : 'Unknown CSSStyle';
}

function getStyleStructure(styleType) {
    for(let styleKey in cssStyleTypes.styleTypes) {
        let type = cssStyleTypes.styleTypes[styleKey];
        if(type.id === styleType) {
            return type;
        }
    }
    return null;
}

function CSSCompiler() {
    this.COMMENT_BUFFER_LIMIT = 2;
    this.IMPORT_BUFFER_LIMIT = 7;
    this.filters = {};
    this.globalVariables = {};
}

function CSSStyle() {
    this.childrenReduced = 0;
    this.styles = []; // Array of CSSStyleMediaQuery or CSSStyleRule

    this.getName = function() {
        return `Top-level stylesheet`;
    }
}

function CSSStyleIntegrityError() {
    this.lineNumber = 0;
    this.style = null;
    this.message = "";
}

CSSStyleIntegrityError.prototype = {
    setLine: function(line) {
        this.lineNumber = line;
        return this;
    },

    setStyle: function(style) {
        this.style = style;
        return this;
    },

    setErrorMessage: function(message) {
        this.message = message;
        return this;
    },

    toString: function() {
        let message = '';
        if(this.lineNumber > 0) {
            message += `Unexpected error near ${th(this.lineNumber)} line: `;
        }
        if(this.style != null) {
            message += this.style.toString();
        }
        if(this.message) {
            message += ` - ${this.message}`;
        }
        return `${FgRed}${message}${Reset}`;
    }
}

function splitter(text, delimiter) {
    let array = [];
    let stringOperator = null;
    let walkthroughString = false;

    let buf = '';
    let search = '';
    for(let i = 0; i < text.length; i++) {
        const c = text.charAt(i);
        if(c === '\'' || c === '"') {
            if(walkthroughString) {
                if(stringOperator === c) {
                    stringOperator = null;
                    walkthroughString = false;
                }
            } else {
                stringOperator = c;
                walkthroughString = true;
            }
        }

        let skip = false;
        if(!walkthroughString) {
            search = createLimitedBuffer(search, c, delimiter.length);
            if(search === delimiter) {
                array.push(buf.substring(0, buf.length - delimiter.length + 1));
                buf = '';
                skip = true;
            }
        }
        if(!skip) {
            buf += c;
        }
    }
    if(buf.length > 0) {
        array.push(buf);
    }
    return array;
}

CSSCompiler.prototype = {
    init: function() {
        this.initGlobalVariables('', 0);
        this.addFilters();
    },

    interpret: function(input) {
        let style = new CSSStyle();

        let vars = this.initGlobalVariables(input, input.length);
        let kill = false;

        let walkthroughString = false;
        let stringOperator = null;

        while(!kill) {
            const char = input.charAt(vars.i);
            vars.char = char;

            if(char === '\n') {
                vars.lineNumber++;
            }

            if(char === '\'' || char === '"') {
                if(walkthroughString) {
                    if(stringOperator === char) {
                        stringOperator = null;
                        walkthroughString = false;
                    }
                } else {
                    stringOperator = char;
                    walkthroughString = true;
                }
            }

            let queueList = [];
            let filtered = false;
            for(let name in this.filters) {
                const filter = this.filters[name];
                const value = filter.fn(filter, vars);
                if(typeof value === 'boolean') {
                    kill = true;
                    break;
                } else if(typeof value === 'object') {
                    const { enqueue, fn } = value;
                    if(enqueue) {
                        queueList.push({
                            filter: filter,
                            fn: fn
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
                if(char === '{' && !walkthroughString) {
                    if(!vars.bracketAllowed) {
                        simplifiedFatalError(input, vars.i, 'Parentheses haven\'t closed properly at nearby');
                        kill = true;
                        break;
                    }
                    vars.brackets++;

                    let buf = trimBuffer(vars.buffer);

                    const styleTypes = cssStyleTypes.styleTypes;
                    for(let styleType in styleTypes) {
                        const type = styleTypes[styleType];
                        if(type.parse(vars, buf)) {
                            break;
                        }
                    }
                    vars.buffer = '';
                } else if(char === '}' && !walkthroughString) {
                    vars.brackets--;

                    if(cssStyleTypes.stacks.length === 0) {
                        simplifiedFatalError(input, vars.i, 'Serious error (no depth) has found in the code nearby');
                        kill = true;
                        break;
                    }

                    const current = cssStyleTypes.stacks.pop();
                    current.type.enclose(vars, current.style);
                    if(cssStyleTypes.stacks.length > 0) {
                        const parent = cssStyleTypes.stacks[cssStyleTypes.stacks.length - 1];
                        parent.style.styles.push(current.style);
                    } else {
                        style.styles.push(current.style);
                    }
                    vars.buffer = '';
                } else {
                    vars.buffer += `${char}`;
                }
            }

            for(let queue of queueList) {
                queue.fn(queue.filter);
            }

            vars.i++;
            if(vars.i === vars.len) {
                break;
            }
        }

        if(!kill && vars.brackets > 0) {
            simplifiedFatalError(input, vars.i, 'Parentheses haven\'t closed properly at nearby');
            kill = true;
        }

        if(!kill) {
            const importFilter = this.findFilter('import');
            const imports = importFilter.variables.imports;
            for(let value of imports) {
                let styleImport = new CSSStyleImport();
                styleImport.importText = value.line;
                styleImport.line = value.lineNumber;
                style.styles.push(styleImport);
            }
            return style;
        }
        return null;
    },

    mergeRules: function(parent, styles) {
        let selectorList = {};
        for(let i = 0; i < styles.length; i++) {
            let rule = styles[i];
            if(rule.type === CSSSTYLE_TYPE_IMPORT) {
                let style = new CSSStyleImport();
                style.setRule(rule.getRule());
                style.decompressedSelectorIndices = [ i ];
                style.line = rule.line;
                parent.styles.push(rule);
                continue;
            }

            const isRuleStyle = rule.type === CSSSTYLE_TYPE_RULE;
            if(isRuleStyle) {
                rule.selectorTexts.sort();
            }

            const key = rule.getRule();
            if(typeof selectorList[key] === 'undefined') {
                selectorList[key] = {
                    reduced: 0,
                    type: rule.type,
                    values: isRuleStyle ? rule.rules : rule.styles,
                    originalIndices: [ i ]
                }
            } else {
                const cache = selectorList[key];
                cache.reduced++;
                cache.values = cache.values.concat(isRuleStyle ? rule.rules : rule.styles);
                cache.originalIndices = cache.originalIndices.concat([ i ]);
                this.globalVariables.totalMerged += (isRuleStyle ? rule.rules : rule.styles).length;
            }
        }

        for(let styleSelector in selectorList) {
            const { reduced, type, values, originalIndices } = selectorList[styleSelector];

            let rule;
            if(type === CSSSTYLE_TYPE_RULE) {
                rule = new CSSStyleRule();
                rule.rules = values;
            } else {
                rule = new (getStyleStructure(type).constructor)();
                this.mergeRules(rule, values);
            }
            rule.setRule(styleSelector);
            rule.decompressedSelectorIndices = originalIndices;

            parent.childrenReduced += reduced;
            parent.styles.push(rule);
        }

        parent.styles.sort((a, b) => a.getRule().localeCompare(b.getRule()));
    },

    mergeSelectors: function(parent, styles) {
        let ruleList = {};
        for(let i = 0; i < styles.length; i++) {
            let rule = styles[i];
            if(rule.type === CSSSTYLE_TYPE_RULE) {
                rule.rules.sort().reverse();

                const key = rule.rules.join(';');
                if(typeof ruleList[key] === 'undefined') {
                    ruleList[key] = {
                        reduced: 0,
                        selectorTexts: rule.selectorTexts,
                        originalIndices: [ i ],
                    };
                } else {
                    const temp = ruleList[key];
                    ruleList[key] = {
                        reduced: temp.reduced + 1,
                        selectorTexts: temp.selectorTexts.concat(rule.selectorTexts),
                        originalIndices: temp.originalIndices.concat([ i ])
                    };
                    this.globalVariables.totalMerged += rule.selectorTexts.length;
                }
            } else {
                let style = new rule.constructor();
                style.setRule(rule.getRule());
                style.decompressedSelectorIndices = [i];
                if(rule.hasOwnProperty('styles')) {
                    this.mergeSelectors(style, rule.styles);
                }
                parent.styles.push(style);
            }
        }

        for(let styleRule in ruleList) {
            const { reduced, selectorTexts, originalIndices } = ruleList[styleRule];

            const rule = new CSSStyleRule();
            rule.selectorTexts = selectorTexts;
            rule.rules = splitter(styleRule, ';');
            rule.decompressedSelectorIndices = originalIndices;

            parent.childrenReduced += reduced;
            parent.styles.push(rule);
        }

        parent.styles.sort((a, b) => a.getRule().localeCompare(b.getRule()));
    },

    verifyStyleIntegrity(uncompressed, compressed) {
        let errors = [];
        this._verifyStyleIntegrity(errors, uncompressed, compressed);
        return errors;
    },

    _verifyStyleIntegrity(errors, uncompressed, compressed) {
        const childrenReduced = compressed.childrenReduced;
        if(uncompressed.styles.length !== compressed.styles.length + childrenReduced) {
            let selectors = `${compressed.styles.length}`;
            if(childrenReduced > 0) {
                selectors += ` + ${childrenReduced} = ${compressed.styles.length + childrenReduced}`;
            }
            errors.push(new CSSStyleIntegrityError().setLine(uncompressed.line).setStyle(uncompressed).setErrorMessage(`Selectors length are not identical at the line. (original: ${uncompressed.styles.length}, compressed: ${selectors})`));
            return;
        }
        const verify = (compressedStyle, uncompressedStyle) => {
            if(uncompressedStyle.type !== compressedStyle.type) {
                errors.push(new CSSStyleIntegrityError().setLine(uncompressedStyle.line).setStyle(uncompressedStyle).setErrorMessage(`Style types are not identical. (original: ${uncompressedStyle.type} (${getFriendlyCSSStyleType(uncompressedStyle.type)}), compressed: ${compressedStyle.type} (${getFriendlyCSSStyleType(compressedStyle.type)}))`));
                return;
            }

            if(uncompressedStyle.compare(errors, compressedStyle)) {
                this._verifyStyleIntegrity(errors, uncompressedStyle, compressedStyle);
            }
        }
        for(let i = 0; i < compressed.styles.length; i++) {
            const compressedStyle = compressed.styles[i];
            const indices = compressedStyle.decompressedSelectorIndices;
            for(let j = 0; j < indices.length; j++) {
                const uncompressedStyle = uncompressed.styles[indices[j]];
                verify(compressedStyle, uncompressedStyle);
            }
        }
    },

    toString: function(style, options) {
        return this._toString(style.styles, options || {}, '', 0);
    },

    _toString: function(styles, options, buffer, indent) {
        const colorize = options.color || false;
        const textIndent = options.textIndent || false;

        let indentation = '';
        for(let i = 0; i < indent; i++) {
            indentation += '    ';
        }
        let apply = (contents) => {
            if(colorize) {
                contents = `${getPaletteByIndent(indent)}${contents}${Reset}`;
            }
            if(textIndent) {
                contents = indentation + contents + '\n';
            }
            return contents;
        };
        for(let rule of styles) {
            const hasRules = rule.hasOwnProperty('rules');
            const hasStyles = rule.hasOwnProperty('styles');
            if(hasRules || hasStyles) {
                if(hasRules) {
                    buffer += apply(`${rule.getRule()} { ${rule.rules.join(';') } }`);
                } else {
                    buffer += apply(`${rule.getRule()} {`);
                    buffer += this._toString(rule.styles, options, '', indent + 1);
                    buffer += apply(`}`);
                }
            } else {
                buffer = apply(` ${rule.getRule()} `) + buffer;
            }
        }
        return buffer;
    },

    initGlobalVariables: function(input, length) {
        this.globalVariables = {
            input: input,
            i: 0,
            len: length,
            char: '',
            buffer: '',
            brackets: 0,
            bracketAllowed: true,
            lineNumber: 1,
            totalMerged: 0
        };
        return this.globalVariables;
    },

    statistics: function() {
        const vars = this.globalVariables;
        return {
            totalMerged: vars.totalMerged,
            invalidate: function() {
                vars.totalMerged = 0
            }
        }
    },

    addFilter: function(name, variables, fn) {
        this.filters[name] = {
            enabled: false,
            variables: variables,
            fn: fn
        }
    },

    findFilter: function(name) {
        return this.filters[name];
    },

    addFilters: function() {
        // Comment Filter
        this.addFilter('comment', {
            buffer: ''
        }, (filter, globalVariables) => {
            let enqueue = false;
            let buffer = createLimitedBuffer(filter.variables.buffer, globalVariables.char, this.COMMENT_BUFFER_LIMIT);
            if(buffer === '/*') {
                filter.enabled = true;
                if(globalVariables.buffer.length >= this.COMMENT_BUFFER_LIMIT) {
                    globalVariables.buffer = globalVariables.buffer.substring(0, globalVariables.buffer.length - this.COMMENT_BUFFER_LIMIT + 1);
                }
            } else if(buffer === '*/') {
                if(!filter.enabled) {
                    simplifiedFatalError(globalVariables.input, globalVariables.i, 'Serious error (invalid comments block) has found in the code nearby');
                    return false;
                }
                // Enqueue disable this filter
                globalVariables.buffer = '';
                enqueue = true;
            }
            filter.variables.buffer = buffer;
            return {
                enqueue: enqueue,
                fn: (filter) => {
                    filter.enabled = false;
                }
            };
        });

        // Import Filter
        this.addFilter('import', {
            buffer: '',
            line: '',
            imports: []
        }, (filter, globalVariables) => {
            let enqueue = false;
            let buffer = createLimitedBuffer(filter.variables.buffer, globalVariables.char, this.IMPORT_BUFFER_LIMIT);
            if(buffer === '@import') {
                if(filter.enabled) {
                    simplifiedFatalError(globalVariables.input, globalVariables.i, 'Lack of semicolon has found in the code nearby');
                    return false;
                }
                filter.enabled = true;
                filter.variables.line += '@import';
                if(globalVariables.buffer.length >= this.IMPORT_BUFFER_LIMIT) {
                    globalVariables.buffer = globalVariables.buffer.substring(0, globalVariables.buffer.length - this.IMPORT_BUFFER_LIMIT + 1);
                }
            } else if(filter.enabled) {
                filter.variables.line += `${globalVariables.char}`;
                if(globalVariables.char === ';') {
                    filter.variables.imports.push({
                        line: filter.variables.line,
                        lineNumber: globalVariables.lineNumber
                    });
                    filter.variables.line = '';
                    enqueue = true;
                }

                // Encountered break-line before close @import expression
                if(globalVariables.char === '\n') {
                    simplifiedFatalError(globalVariables.input, globalVariables.i, 'Lack of semicolon has found in the code nearby');
                    return false;
                }
            }
            filter.variables.buffer = buffer;
            return {
                enqueue: enqueue,
                fn: (filter) => {
                    filter.enabled = false;
                }
            }
        });
    },

    logError: function(message) {
        console.error(`${FgRed}%s${Reset}`, message);
    }
};

const Reset = "\x1b[0m";
const Bright = "\x1b[1m";
const Dim = "\x1b[2m";
const Underscore = "\x1b[4m";
const Blink = "\x1b[5m";
const Reverse = "\x1b[7m";
const Hidden = "\x1b[8m";

const FgBlack = "\x1b[30m";
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const FgYellow = "\x1b[33m";
const FgBlue = "\x1b[34m";
const FgMagenta = "\x1b[35m";
const FgCyan = "\x1b[36m";
const FgWhite = "\x1b[37m";

const INDENTATION_COLOR_MAP = [ FgMagenta, FgCyan, FgGreen, FgRed, FgYellow ];

function getPaletteByIndent(indent) {
    return INDENTATION_COLOR_MAP[indent % INDENTATION_COLOR_MAP.length]
}

function trimBuffer(text) {
    return text.replace(/(?:\r\n|\r|\n)/g, '').trim();
}

function simplifiedFatalError(input, index, reason) {
    const stringPart = excerptStringPart(input, index);
    const messages = [
        `${reason}:`,
        `${stringPart}`
    ];
    fatalError(messages);
}

function fatalError(messages) {
    console.error(`${FgRed}%s${Reset}`, '###############################################################');
    console.error(`${FgRed}%s${Reset}`, '######################### FATAL ERROR #########################');
    console.error(`${FgRed}%s${Reset}`, '###############################################################');
    console.error(`${FgRed}%s${Reset}`, '## ');
    for(let message of messages) {
        const split = message.split(/(?:\r\n|\r|\n)/g);
        for(let piece of split) {
            console.error(`${FgRed}%s${Reset}`, `## ${piece}`);
        }
    }
    console.error(`${FgRed}%s${Reset}`, '## ');
    console.error(`${FgRed}%s${Reset}`, '###############################################################');
}

function excerptStringPart(text, index) {
    let length = text.length;

    const from = Math.max(index - 100, 0);
    const to = Math.min(index + 100, length);

    return text.substring(from, to);
}

function createLimitedBuffer(buffer, newLetter, limit) {
    buffer += `${newLetter}`;
    const bufferLength = buffer.length;
    if(bufferLength > limit) {
        buffer = buffer.substring(bufferLength - limit);
    }
    return buffer;
}

function th(line) {
    if(line === 1) {
        return '1st';
    } else if(line === 2) {
        return '2nd';
    } else if(line === 3) {
        return '3rd';
    } else {
        return `${line}th`
    }
}

module.exports = {
    CSSCompiler,
    CSSStyle,
    CSSStyleIntegrityError,
    splitter
};