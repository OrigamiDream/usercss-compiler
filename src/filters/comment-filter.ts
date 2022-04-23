import {FilterArgument, FilterCallback} from "./filters";
import {Utils} from "../utils";
import {ErrorUtils} from "../errors";

export interface CommentArgument extends FilterArgument {
    buffer: string
}

const COMMENT_BUFFER_LIMIT = 2;

export const COMMENT_FILTER_NAME = 'comment';
export const CommentFilterCallback: FilterCallback<CommentArgument> = (filter, ctx) => {
    let enqueue = false;
    let buffer = Utils.truncateBuffer(filter.args.buffer, ctx.char, COMMENT_BUFFER_LIMIT);
    if(buffer === '/*') {
        filter.enabled = true;
        if(ctx.buffer.length >= COMMENT_BUFFER_LIMIT) {
            ctx.buffer = ctx.buffer.substring(0, ctx.buffer.length - COMMENT_BUFFER_LIMIT + 1);
        }
    } else if(buffer === '*/') {
        if(!filter.enabled) {
            ErrorUtils.fatalErrorDefaults(ctx.inputs, ctx.index, 'Fatal error (invalid comments block) has found in the code nearby');
            return false;
        }
        ctx.buffer = '';
        enqueue = true;
    }
    filter.args.buffer = buffer;
    return {
        enqueue: enqueue,
        callback: (filter) => {
            filter.enabled = false;
        }
    };
}
