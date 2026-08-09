import type {
    StudyContent,
} from "../types";

export type ParsedPgnMove = {
    san: string;

    comments: string[];

    annotations: string[];

    variations:
    ParsedPgnMove[][];
};

export type ParsedPgnGame = {
    headers:
    Record<string, string>;

    moves:
    ParsedPgnMove[];
};

export type ImportPgnResult = {
    content: StudyContent;

    headers:
    Record<string, string>;
};