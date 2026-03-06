export type ScriptStatus = "verified" | "patched" | "testing";
export interface ScriptCardProps {
    id: string;
    title: string;
    coverUrl: string | null;
    gameName: string;
    gameSlug: string;
    authorUsername: string;
    authorAvatar: string | null;
    status: ScriptStatus;
    likeCount: number;
    viewCount: number;
    copyCount: number;
    tags: string[];
    rawCode: string;
    aiScore?: number;
    isAuthorPro?: boolean;
    index?: number;
}
export declare function ScriptCard({ id, title, coverUrl, gameName, gameSlug, authorUsername, authorAvatar, status, likeCount, viewCount, copyCount, tags, rawCode, aiScore, isAuthorPro, index, }: ScriptCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=index.d.ts.map