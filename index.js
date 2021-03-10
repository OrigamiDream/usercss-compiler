let fs = require('fs');
let { CSSCompiler, CSSStyle, CSSStyleIntegrityError } = require('./compiler');

validate();

function validate() {
    const args = process.argv.slice(2);
    if(args.length !== 2) {
        CSSCompiler.prototype.logError('Invalid argument: [uncompressed style path] [compressed result style path]');
        return;
    }
    try {
        if(fs.existsSync(args[0])) {
            parseUserStyle(args[0], args[1]);
        } else {
            CSSCompiler.prototype.logError(`No file exists at: ${args[0]}`);
        }
    } catch(err) {
        CSSCompiler.prototype.logError(err);
    }
}

function parseUserStyle(uncompressedStylePath, compressedStylePath) {
    console.log('Preparing files...');

    let contents = fs.readFileSync(uncompressedStylePath, 'utf8');

    function fetchUserStyleProperties(contents) {
        const start = "/* ==UserStyle==";
        const end = "==/UserStyle== */";

        let begin = contents.indexOf(start);
        let finish = contents.indexOf(end);

        if(begin === -1 || finish === -1) {
            return '';
        }

        let properties = '';
        for(let i = begin; i < finish + end.length; i++) {
            properties += contents[i];
        }
        return properties;
    }

    let properties = fetchUserStyleProperties(contents);
    perform(properties, contents, compressedStylePath);
}

function verifyIntegrity(compiler, before, after) {
    const errors = compiler.verifyStyleIntegrity(before, after);
    if(errors.length > 0) {
        console.log('Original styles and compressed styles\' components are not identical.');
        console.log('Caused by:');
        for(let error of errors) {
            console.log(error.toString());
        }
    } else {
        console.log('Original styles and compressed styles\' components are identical.');
        printDifferences(compiler, before, after);
        console.log(`Merged components: ${compiler.statistics().totalMerged}`);
        return true;
    }
    return false;
}

function printDifferences(compiler, before, after) {
    const beforeResult = compiler.toString(before, {
        textIndent: true
    });
    const afterResult = compiler.toString(after, {
        textIndent: true
    });

    console.log(`Size compression: ${beforeResult.length} -> ${afterResult.length}`);
    console.log(`Compressed ratio: ${(100 - (afterResult.length * 100 / beforeResult.length)).toFixed(1)}%`);
}

function perform(properties, contents, compressedStylePath) {
    console.log('Preparing compiler...');

    const compiler = new CSSCompiler();
    compiler.init();

    console.log('Reading...');

    const uncompressed = compiler.interpret(contents);
    const semicompressed = new CSSStyle();
    const compressed = new CSSStyle();

    console.log('');
    console.log('Semi-merging...');
    compiler.statistics().invalidate();
    compiler.mergeRules(semicompressed, uncompressed.styles);
    printDifferences(compiler, uncompressed, semicompressed);

    console.log('');
    console.log('Final merging...');
    compiler.statistics().invalidate();
    compiler.mergeSelectors(compressed, semicompressed.styles);
    if(!verifyIntegrity(compiler, semicompressed, compressed)) {
        return;
    }

    console.log('');
    console.log('FINAL STATISTICS');
    printDifferences(compiler, uncompressed, compressed);

    const compressedResult = compiler.toString(compressed, {
        textIndent: true
    });

    console.log('Writing them in file...');
    if(fs.existsSync(compressedStylePath)) {
        fs.unlinkSync(compressedStylePath);
    }

    fs.appendFileSync(compressedStylePath, properties + '\n' + compressedResult, 'utf8');
}