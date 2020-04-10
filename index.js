let fs = require('fs');
let { CSSCompiler, CSSStyle, CSSStyleIntegrityError } = require('./compiler');

console.log('Preparing files...');

const uncompressedStylePath = 'uncompressed.css';
const compressedStylePath = 'compressed.css';
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

console.log('Preparing compiler...');

const compiler = new CSSCompiler();
compiler.init();

console.log('Reading...');

const uncompressed = compiler.interpret(contents);
const compressed = new CSSStyle();

console.log('Merging...');
compiler.mergeStyles(compressed, uncompressed.styles);

// DEBUG START
// compressed.styles[20].type = 2; // Changing CSS style type into media-query
//
// compressed.styles[10].styles.splice(26, 59); // Remove a selector from compressed stylesheet
//
// compressed.styles[47].documentText = '@-moz-document url-prefix("https://fake.naver.com")'; // Wrong document selector
// DEBUG END

// Verify uncompressed and compressed styles integrity.
const errors = compiler.verifyStyleIntegrity(uncompressed, compressed);
if(errors.length > 0) {
    console.log('Original styles and compressed styles\' components are not identical.');
    console.log('Caused by:');
    for(let error of errors) {
        console.log(error.toString());
    }
} else {
    console.log('Original styles and compressed styles\' components are identical.');

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
}