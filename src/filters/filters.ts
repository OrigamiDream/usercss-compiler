import {Context} from "../utils";
import {COMMENT_FILTER_NAME, CommentArgument, CommentFilterCallback} from "./comment-filter";
import {IMPORT_FILTER_NAME, ImportArgument, ImportFilterCallback} from "./import-filter";

export interface FilterArgument {
}

export type FilterResultCallback<T extends FilterArgument> = (filter: Filter<T>) => void;
export type FilterCallback<T extends FilterArgument> = (filter: Filter<T>, ctx: Context) => FilterResult<T> | boolean;

export interface FilterResult<T extends FilterArgument> {
    enqueue: boolean
    callback: FilterResultCallback<T>;
}

export interface Filter<T extends FilterArgument> {
    name: string
    enabled: boolean
    args: T
    callback: FilterCallback<T>
}

export class Filters {

    private readonly filters: Filter<any>[] = [];

    findFilter<T extends FilterArgument>(name: string): Filter<T> | undefined {
        const found = this.filters.filter(filter => filter.name === name);
        if(found.length == 0) {
            return undefined;
        }
        return found[0];
    }

    getFilters<T extends FilterArgument>(): Filter<T>[] {
        return this.filters;
    }

    addFilter<T extends FilterArgument>(name: string, args: T, callbackImpl: FilterCallback<T>) {
        const filter: Filter<T> = {
            name: name,
            enabled: false,
            args: args,
            callback: callbackImpl
        };
        this.filters.push(filter);
    }

    static defaults(): Filters {
        const filters = new Filters();
        filters.addFilter<CommentArgument>(COMMENT_FILTER_NAME, {
            buffer: ''
        }, CommentFilterCallback);
        filters.addFilter<ImportArgument>(IMPORT_FILTER_NAME, {
            buffer: '',
            line: '',
            imports: []
        }, ImportFilterCallback);
        return filters;
    }

}