export class NumberHelpers {
    static isNumber(value: string): boolean {
        return (!isNaN(parseInt(value)) && !isNaN(+value - 0));
    }
}