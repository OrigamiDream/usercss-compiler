let fs = require('fs');
let { CSSCompiler, CSSStyle } = require('./compiler');

console.log('Preparing files...');

const uncompressedStylePath = 'uncompressed.css';
const compressedStylePath = 'compressed.css';
let contents = fs.readFileSync(uncompressedStylePath, 'utf8');

function fetchUserStyleProperties(contents) {
    const start = "/* ==UserStyle==";
    const end = "==/UserStyle== */";

    let begin = contents.indexOf(start);
    let finish = contents.indexOf(end);

    let properties = '';
    for(let i = begin; i < finish + end.length; i++) {
        properties += contents[i];
    }
    return {
        properties: properties,
        lastIndex: finish + end.length
    }
}

let { properties, lastIndex } = fetchUserStyleProperties(contents);
let remaining = contents.substring(lastIndex, contents.length);

console.log('Preparing compiler...');

const compiler = new CSSCompiler();
compiler.init();

console.log('Reading...');

const uncompressed = compiler.purge(remaining);
const compressed = new CSSStyle();

console.log('Merging...');
compiler.mergeStyles(compressed, uncompressed.styles);

const uncompressedResult = compiler.toString(uncompressed, {
    textIndent: true
});
const compressedResult = compiler.toString(compressed, {
    textIndent: true
});

console.log(`Uncompressed size: ${uncompressedResult.length}`);
console.log(`Compressed size: ${compressedResult.length}`);
console.log(`Total compressed: -${(100 - (compressedResult.length * 100 / uncompressedResult.length)).toFixed(1)}%`);

console.log('Writing them in file...');

if(fs.existsSync(compressedStylePath)) {
    fs.unlinkSync(compressedStylePath);
}

fs.appendFileSync(compressedStylePath, properties + '\n' + compressedResult, 'utf8');