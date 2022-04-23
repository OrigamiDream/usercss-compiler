import {CSSStyle} from "./styles/css-style";
import {Utils} from "./utils";
import {Color} from "./colors";

export class ErrorUtils {

    static excerptStrings(text: string, index: number, offsets = 100) {
        const length = text.length;

        const from = Math.max(index - offsets, 0);
        const to = Math.min(index + offsets, length);

        return text.substring(from, to);
    }

    static fatalErrorDefaults(inputs: string, index: number, reason: string) {
        const parts = ErrorUtils.excerptStrings(inputs, index);
        const messages = [`${reason}:`, `${parts}`];
    }

    static fatalError(messages: string[]) {
        console.error(`${Color.RED}%s${Color.RESET}`, '###############################################################');
        console.error(`${Color.RED}%s${Color.RESET}`, '######################### FATAL ERROR #########################');
        console.error(`${Color.RED}%s${Color.RESET}`, '###############################################################');
        console.error(`${Color.RED}%s${Color.RESET}`, '## ');
        for(let message of messages) {
            const split = message.split(/(?:\r\n|\r|\n)/g);
            for(let piece of split) {
                console.error(`${Color.RED}%s${Color.RESET}`, `## ${piece}`);
            }
        }
        console.error(`${Color.RED}%s${Color.RESET}`, '## ');
        console.error(`${Color.RED}%s${Color.RESET}`, '###############################################################');
    }

}

export class CSSStyleIntegrityError {

    private lineNumber = 0;
    private style?: CSSStyle = undefined;
    private message = '';

    setLine(line: number) {
        this.lineNumber = line;
        return this;
    }

    setStyle(style: CSSStyle) {
        this.style = style;
        return this;
    }

    setErrorMessage(message: string) {
        this.message = message;
        return this;
    }

    toString() {
        let message = '';
        if(this.lineNumber > 0) {
            message += `Unexpected error near ${Utils.numberRank(this.lineNumber)} line: `;
        }
        if(this.style !== undefined) {
            message += this.style.toString();
        }
        if(this.message) {
            message += ` - ${this.message}`;
        }
        return `${Color.RED}${message}${Color.RESET}`;
    }
}
