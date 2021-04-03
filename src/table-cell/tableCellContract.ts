import { Contract, Breakpoints } from "@paperbits/common";
import { LocalStyles } from "@paperbits/common/styles";

// export interface TableCellContract extends Contract {
//     size?: Breakpoints;
//     alignment?: Breakpoints;
//     offset?: Breakpoints;
//     overflowX?: string;
//     overflowY?: string;
// }

export interface TableCellSpan {
    /**
     * Column span is useful when only on horizontal position (left or right) specified.
     */
    colSpan?: number;

    /**
     * Row span is useful when only on vertical position (top or bottom) specified.
     */
    rowSpan?: number;
}

export interface TableCellPosition {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
}

export interface TableCellContract extends Contract {
    /**
     * @examples ["article", "header", "aside", "content", "footer"]
     */
    role: string;
    position?: Breakpoints<TableCellPosition>;
    span?: Breakpoints<TableCellSpan>;
    alignment?: any;
    nodes?: any[];
    styles?: LocalStyles;
}