interface JqueryFunction {
    (obj: any): JQElem;
    trim(val: any): string;
    extend(first: any, second: any): any;
    map(data: any, mapper: any): any;
    ajax(config: any): any;
}
interface FileReader {
    onload: (resultEvent: any) => void;
    readAsBinaryString(file: any): void;
}
interface ICoords {
    top: number;
    left: number;
}
interface JQElem {
    find(selector: string): JQElem;
    children(selector: string): JQElem;
    closest(selector: string): JQElem;
    children(): JQElem;
    text(text: string): JQElem;
    html(html: any): JQElem;
    show(): JQElem;
    hide(): JQElem;
    remove(): void;
    parent(): JQElem;
    append(elem: Object): JQElem;
    prepend(elem: Object): JQElem;
    val(): string;
    val(text: string): JQElem;
    clone(): JQElem;
    first(): JQElem;
    attr(attr: string): string;
    attr(attr: string, attrVal: any): JQElem;
    prop(attr: string): string;
    prop(attr: string, attrVal: any): JQElem;
    removeAttr(attr: string): any;
    data(key: string): any;
    data(key: string, val: any): JQElem;
    on(eventName: string, callback: Object): JQElem;
    off(): JQElem;
    off(eventName: string): JQElem;
    submit(): void;
    get(index: number): any;
    siblings(): JQElem;
    siblings(selector: string): JQElem;
    length: number;
    css(key: string): any;
    css(key: string, val: string): JQElem;
    addClass(className: string): JQElem;
    removeClass(className: string): JQElem;
    eq(index: number): JQElem;
    serialize(): string;
    serializeArray(): Object;
    after(html: string): JQElem;
    datepicker(conf: any): JQElem;
    zIndex(): number;
    offset(): ICoords;
    width(): number;
    height(): number;
    end(): JQElem;
    last(): JQElem;
}
declare var $: JqueryFunction;
