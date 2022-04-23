export interface Context {
    inputs: string
    index: number
    length: number
    char: string
    buffer: string
    brackets: number
    bracketAllowed: boolean
    lineNumber: number
    totalMerged: number
}

export function defaultContext(inputs: string, length: number): Context {
    return {
        inputs: inputs,
        index: 0,
        length: length,
        char: '',
        buffer: '',
        brackets: 0,
        bracketAllowed: true,
        lineNumber: 1,
        totalMerged: 0
    };
}

export class Utils {

    static truncateBuffer(buffer: string, newLetter: string, limit: number) {
        buffer += `${newLetter}`;
        const length = buffer.length;
        if(length > limit) {
            buffer = buffer.substring(length - limit);
        }
        return buffer;
    }

    static strip(text: string) {
        return text.replace(/(?:\r\n|\r|\n)/g, '').trim();
    }

    static numberRank(num: number) {
        let suffix = 'th';
        switch (num) {
            case 1:
                suffix = 'st';
                break;

            case 2:
                suffix = 'nd';
                break;

            case 3:
                suffix = 'rd';
                break;

            default:
                break;
        }
        return `${num}${suffix}`;
    }

    static splitRules(text: string, delimiter: string) {
        let array = [];
        let ops = undefined;
        let walkThrough = false;

        let buffer = '';
        let search = '';
        for(let i = 0; i < text.length; ++i) {
            const c = text.charAt(i);
            if(c === '\'' || c === '"') {
                if(walkThrough) {
                    if(ops === c) {
                        ops = undefined;
                        walkThrough = false;
                    }
                } else {
                    ops = c;
                    walkThrough = true;
                }
            }

            let skip = false;
            if(!walkThrough) {
                search = Utils.truncateBuffer(search, c, delimiter.length);
                if(search === delimiter) {
                    array.push(buffer.substring(0, buffer.length - delimiter.length + 1));
                    buffer = '';
                    skip = true;
                }
            }
            if(!skip) {
                buffer += c;
            }
        }
        if(buffer.length > 0) {
            array.push(buffer);
        }
        return array;
    }

}