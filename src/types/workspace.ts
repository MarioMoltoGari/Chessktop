export type Workspace =
    | {
        type: "study";
        studyId: string;
    }
    | {
        type: "training";
        trainingId: string;
    };

export type ActiveWorkspace =
    Workspace | null;