export type SelectValueType = 0 | 0.5 | 1;

export const NotSelect: SelectValueType;
export const IncompleteSelect: SelectValueType;
export const FullSelect: SelectValueType;

export type TreeKeyType = string | number | {};
export type TreeValueType = any;

export declare class Tree {

    isLeaf(): boolean;
    isEqual(treeNode: Tree): boolean;

    isFullSelect(cascade?: boolean): boolean;
    isNotSelect(cascade?: boolean): boolean;
    isIncompleteSelect(cascade?: boolean): boolean;
    selectStatus(cascade?: boolean): SelectValueType;

    getLeafCount(params?: {includeWeakNode?: boolean}): number;
    getSelectedLeafCount(params?: {includeWeakNode?: boolean}): number;
    getDeepth(params?: {includeWeakNode?: boolean}): number;
    getInfo(): {};
    getId(): TreeValueType;
    getStringId(): string;
    getParent(): Tree | void;
    getWeakParent(): Tree | void;
    getChildren(): Tree[];
    getLeafChildren(params?: {includeWeakNode?: boolean}): Tree[];
    getFullSelectChildren(cascade?: boolean,params?: {includeWeakNode?: boolean}): Tree[]
    getPath(): string;

    setInitialState(selectedIds: TreeKeyType[], cascade?: boolean): Tree[];
    update(cascade?: boolean): void;
    search(
        text: string,
        keys: TreeKeyType[],
        multiselect: boolean,
        exactly?: boolean,
        canSearch?: boolean
    ): Tree[];

    hasAncestor(ancestor: Tree): boolean;
    findById(childId: TreeKeyType): Tree[] | void;

    private _fromUpNotification(status: boolean): void;
    private _fromDownNotification(): void;
    private _onStatusChange(): void;
    private _stringId(id: TreeKeyType): string;
}

declare function InitTree<T>(
    root ?: T,
    parent ?: Tree,
    childrenKey ?: TreeKeyType,
    idKey ?: TreeKeyType,
    onStatusChange?: (treeNode: Tree) => void,
    rootPath?: (root: T) => string,
    parentPath?: (root: T) => string,
): Tree;

export default InitTree;