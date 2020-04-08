const CSSSTYLE_TYPE_RULE = 1;
const CSSSTYLE_TYPE_MEDIA = 2;
const CSSSTYLE_TYPE_IMPORT = 3;
const CSSSTYLE_TYPE_MOZILLA_DOCUMENT = 4;

function CSSCompiler() {
    this.COMMENT_BUFFER_LIMIT = 2;
    this.IMPORT_BUFFER_LIMIT = 7;
    this.filters = {};
    this.globalVariables = {};
}

function CSSStyle() {
    this.styles = []; // Array of CSSStyleMediaQuery or CSSStyleRule
}

function CSSStyleRule() {
    this.type = CSSSTYLE_TYPE_RULE;
    this.selectorTexts = []; // Array of String
    this.rules = []; // Array of String
}

function CSSStyleImport() {
    this.type = CSSSTYLE_TYPE_IMPORT;
    this.importText = '';
}

function CSSStyleMediaQuery() {
    this.type = CSSSTYLE_TYPE_MEDIA;
    this.mediaRuleText = '';
    this.styles = []; // Array of CSSStyleRule
}

function CSSStyleMozillaDocument() {
    this.type = CSSSTYLE_TYPE_MOZILLA_DOCUMENT;
    this.documentText = '';
    this.styles = []; // Array of CSSStyleRule
}

CSSCompiler.prototype = {
    init: function() {
        this.initGlobalVariables('', 0);
        this.addFilters();
    },

    purge: function(input) {
        let style = new CSSStyle();

        let styleRule = new CSSStyleRule();
        let styleRuleValid = false;

        let styleMediaQuery = new CSSStyleMediaQuery();
        let styleMediaValid = false;

        let styleMozilla = new CSSStyleMozillaDocument();
        let styleMozillaValid = false;

        let vars = this.initGlobalVariables(input, input.length);
        let kill = false;
        while(!kill) {
            const char = input.charAt(vars.i);
            vars.char = char;

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
                if(char === '{') {
                    if(!vars.bracketAllowed) {
                        simplifiedFatalError(input, vars.i, 'Serious error has found in the code nearby');
                        kill = true;
                        break;
                    }
                    vars.brackets++;
                    vars.justOpened = true;

                    let buf = trimBuffer(vars.buffer);
                    if(buf.startsWith('@media')) {
                        styleMediaQuery = new CSSStyleMediaQuery();
                        styleMediaValid = true;
                        styleMediaQuery.mediaRuleText = buf;
                    } else if(buf.startsWith('@-moz-document')) {
                        styleMozilla = new CSSStyleMozillaDocument();
                        styleMozillaValid = true;
                        styleMozilla.documentText = buf;
                    } else {
                        styleRule = new CSSStyleRule();
                        styleRuleValid = true;
                        const selectorTexts = trimBuffer(vars.buffer).split(',');
                        for(let selectorText of selectorTexts) {
                            styleRule.selectorTexts.push(trimBuffer(selectorText));
                        }
                    }
                    vars.buffer = '';
                } else if(char === '}') {
                    vars.brackets--;
                    if(!styleRuleValid && !styleMediaValid && !styleMozillaValid) {
                        simplifiedFatalError(input, vars.i, 'Serious error has found in the code nearby');
                        kill = true;
                        break;
                    }

                    const execute = () => {
                        let descent = false;
                        let nextStyle = null;
                        if(styleRuleValid) {
                            let rules = trimBuffer(vars.buffer).split(';');
                            for(let rule of rules) {
                                if(rule.length === 0) {
                                    continue;
                                }
                                styleRule.rules.push(trimBuffer(rule));
                            }
                            descent = true;
                            styleRuleValid = false;
                            nextStyle = styleRule;
                            styleRule = null;
                        }
                        if(styleMediaValid) {
                            if(descent) {
                                styleMediaQuery.styles.push(nextStyle);
                                return;
                            } else {
                                descent = true;
                                styleMediaValid = false;
                                nextStyle = styleMediaQuery;
                                styleMediaQuery = null;
                            }
                        }
                        if(styleMozillaValid) {
                            if(descent) {
                                styleMozilla.styles.push(nextStyle);
                                return;
                            } else {
                                descent = true;
                                styleMozillaValid = false;
                                nextStyle = styleMozilla;
                                styleMozilla = null;
                            }
                        }

                        if(descent) {
                            style.styles.push(nextStyle);
                        }
                    };
                    execute();
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

        if(!kill) {
            const importFilter = this.findFilter('import');
            const imports = importFilter.variables.imports;
            for(let value of imports) {
                let styleImport = new CSSStyleImport();
                styleImport.importText = value;
                style.styles.push(styleImport);
            }
            return style;
        }
        return null;
    },

    mergeStyles: function(parent, styles) {
        let ruleList = {};
        for(let rule of styles) {
            switch (rule.type) {
                case CSSSTYLE_TYPE_RULE:
                    rule.rules.sort();

                    const key = rule.rules.join(';');
                    if(typeof ruleList[key] === 'undefined') {
                        ruleList[key] = rule.selectorTexts;
                    } else {
                        ruleList[key] = ruleList[key].concat(rule.selectorTexts);
                    }
                    break;

                case CSSSTYLE_TYPE_IMPORT:
                    parent.styles.push(rule);
                    break;

                case CSSSTYLE_TYPE_MEDIA:
                    let mediaQuery = new CSSStyleMediaQuery();
                    mediaQuery.mediaRuleText = rule.mediaRuleText;
                    this.mergeStyles(mediaQuery, rule.styles);
                    parent.styles.push(mediaQuery);
                    break;

                case CSSSTYLE_TYPE_MOZILLA_DOCUMENT:
                    let mozillaDocument = new CSSStyleMozillaDocument();
                    mozillaDocument.documentText = rule.documentText;
                    this.mergeStyles(mozillaDocument, rule.styles);
                    parent.styles.push(mozillaDocument);
                    break;
            }
        }

        for(let styleRule in ruleList) {
            const selectorTexts = ruleList[styleRule];

            const rule = new CSSStyleRule();
            rule.selectorTexts = rule.selectorTexts.concat(selectorTexts);
            rule.rules = rule.rules.concat(styleRule);
            parent.styles.push(rule);
        }
    },

    toString: function(style, options) {
        return this.toStringInternal(style.styles, options || {}, '', 0);
    },

    toStringInternal: function(styles, options, buffer, indent) {
        const colorize = options.color || false;
        const textIndent = options.textIndent || false;

        let indentation = '';
        for(let i = 0; i < indent; i++) {
            indentation += '\t';
        }
        let apply = (contents, color) => {
            if(colorize) {
                contents = `${color}${contents}${Reset}`;
            }
            if(textIndent) {
                contents = indentation + contents + '\n';
            }
            return contents;
        };
        for(let rule of styles) {
            switch (rule.type) {
                case CSSSTYLE_TYPE_RULE:
                    buffer += apply(` ${rule.selectorTexts.join(', ')} { ${rule.rules.join(';')} } `, FgCyan);
                    break;

                case CSSSTYLE_TYPE_IMPORT:
                    buffer = apply(` ${rule.importText} `, FgBlue) + buffer;
                    break;

                case CSSSTYLE_TYPE_MEDIA:
                    buffer += apply(` ${rule.mediaRuleText} { `, FgGreen);
                    buffer += this.toStringInternal(rule.styles, options, '', indent + 1);
                    buffer += apply(` } `, FgGreen);
                    break;

                case CSSSTYLE_TYPE_MOZILLA_DOCUMENT:
                    buffer += apply(` ${rule.documentText} { `, FgMagenta);
                    buffer += this.toStringInternal(rule.styles, options, '', indent + 1);
                    buffer += apply(` } `, FgMagenta);
                    break;
            }
        }
        return buffer;
    },

    printPrettyTokenizedStyles: function(indent, styles) {
        let indentation = '';
        for(let i = 0; i < indent; i++) {
            indentation += '\t';
        }
        for(let rule of styles) {
            switch (rule.type) {
                case CSSSTYLE_TYPE_RULE:
                    console.log(`${indentation}${FgCyan}%s${Reset}`, `${rule.selectorTexts.join(',')} { ${rule.rules.join(';')} }`);
                    break;

                case CSSSTYLE_TYPE_IMPORT:
                    console.log(`${indentation}${FgBlue}%s${Reset}`, `${rule.importText}`);
                    break;

                case CSSSTYLE_TYPE_MEDIA:
                    console.log(`${indentation}${FgGreen}%s${Reset}`, `${rule.mediaRuleText} {`);
                    this.printPrettyTokenizedStyles(indent + 1, rule.styles);
                    console.log(`${indentation}${FgGreen}%s${Reset}`, `}`);
                    break;

                case CSSSTYLE_TYPE_MOZILLA_DOCUMENT:
                    console.log(`${indentation}${FgMagenta}%s${Reset}`, `${rule.documentText} {`);
                    this.printPrettyTokenizedStyles(indent + 1, rule.styles);
                    console.log(`${indentation}${FgMagenta}%s${Reset}`, '}');
                    break;
            }
        }
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
            justOpened: false
        };
        return this.globalVariables;
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
                    simplifiedFatalError(globalVariables.input, globalVariables.i, 'Serious error has found in the code nearby');
                    return false;
                }
                // Enqueue disable this filter
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
                    filter.variables.imports.push(filter.variables.line);
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
    console.error(`${FgRed}%s${Reset}`, '#####################');
    console.error(`${FgRed}%s${Reset}`, '#### FATAL ERROR ####');
    console.error(`${FgRed}%s${Reset}`, '#####################');
    console.error(`${FgRed}%s${Reset}`, '## ');
    for(let message of messages) {
        const split = message.split(/(?:\r\n|\r|\n)/g);
        for(let piece of split) {
            console.error(`${FgRed}%s${Reset}`, `## ${piece}`);
        }
    }
    console.error(`${FgRed}%s${Reset}`, '## ');
    console.error(`${FgRed}%s${Reset}`, '#####################');
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

module.exports = {
    CSSCompiler,
    CSSStyle
};