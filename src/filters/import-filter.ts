import {FilterArgument, FilterCallback} from "./filters";
import {Utils} from "../utils";
import {ErrorUtils} from "../errors";

export interface ImportArgument extends FilterArgument {
    buffer: string
    line: string
    imports: ImportLocation[];
}

export interface ImportLocation {
    line: string,
    lineNumber: number
}

const IMPORT_BUFFER_LIMIT = 7;

export const IMPORT_FILTER_NAME = 'import';
export const ImportFilterCallback: FilterCallback<ImportArgument> = (filter, ctx) => {
    let enqueue = false;
    let buffer = Utils.truncateBuffer(filter.args.buffer, ctx.char, IMPORT_BUFFER_LIMIT);
    if(buffer === '@import') {
        if(filter.enabled) {
            ErrorUtils.fatalErrorDefaults(ctx.inputs, ctx.index, 'Lack of semicolon has found in the code nearby');
            return false;
        }
        filter.enabled = true;
        filter.args.line += '@import';
        if(ctx.buffer.length >= IMPORT_BUFFER_LIMIT) {
            ctx.buffer = ctx.buffer.substring(0, ctx.buffer.length - IMPORT_BUFFER_LIMIT + 1);
        }
    } else if(filter.enabled) {
        filter.args.line += `${ctx.char}`;
        if(ctx.char === ';') {
            filter.args.imports.push({
                line: filter.args.line,
                lineNumber: ctx.lineNumber
            });
            filter.args.line = '';
            enqueue = true;
        }

        if(ctx.char === '\n') {
            ErrorUtils.fatalErrorDefaults(ctx.inputs, ctx.index, 'Lack of semicolon has found in the code nearby');
            return false;
        }
    }
    filter.args.buffer = buffer;
    return {
        enqueue: enqueue,
        callback: (filter) => {
            filter.enabled = false;
        }
    };
}
