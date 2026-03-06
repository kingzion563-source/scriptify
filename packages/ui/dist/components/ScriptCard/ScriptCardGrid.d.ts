import { type ReactNode } from "react";
export interface ScriptCardGridProps {
    children: ReactNode;
    className?: string;
}
/**
 * Card grid layout: CSS grid, repeat(auto-fill, minmax(280px, 1fr)), gap 16px, padding 20px.
 * Use with ScriptCard and ScriptCardSkeleton children.
 */
export declare function ScriptCardGrid({ children, className }: ScriptCardGridProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ScriptCardGrid.d.ts.map