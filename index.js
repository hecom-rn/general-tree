const kChild = '__treechild__';
const kParent = '__treeparent__';
const kWeakParent = '__treeweakparent__';

export const NotSelect = 0;
export const IncompleteSelect = 0.5;
export const FullSelect = 1;

function InitTree(params) {
    const {
        root,
        childrenKey = 'children',
        idKey = 'id',
        onStatusChange = undefined,
        rootPath = undefined,
        parentPath = undefined,
    } = params

    const cacheTrees = { tress: {}, search: [] };
    const tree = new Tree(root, undefined, childrenKey, idKey, onStatusChange, rootPath, parentPath, cacheTrees)
    cacheTrees.search.forEach((item)=> {
        let tree = cacheTrees.tress[item.path];
        if (!tree) {
            tree = new Tree(item.item, undefined, childrenKey, idKey, onStatusChange, rootPath, parentPath, cacheTrees)
        }
        item.tree.root[kChild].splice(item.index, 1, tree)
        tree.getWeakParent().push(item.tree);
    })
    return tree;
}

const Tree = class {
    constructor(
        root,
        parent = undefined,
        childrenKey = 'children',
        idKey = 'id',
        onStatusChange = undefined,
        rootPath,
        parentPath,
        cacheTrees
    ) {
        const rawRootPath = rootPath ? rootPath(root) : undefined;

        this.idKey = idKey;
        rawRootPath && (cacheTrees.tress[rawRootPath] = this);
        this.root = {};
        this.root[kWeakParent] = []
        this.root.info = root || {};
        this.root.path = (parent ? parent.getPath() : '') + '/' + this.getStringId();
        this.root[kParent] = parent;
        this.root[kChild] = this.root.info[childrenKey] ?
            this.root.info[childrenKey].map((item, index) => {
                if (rawRootPath && parentPath && rawRootPath !== parentPath(item)) {
                    cacheTrees.search.push({
                        tree: this,
                        index: index,
                        item: item,
                        path: rootPath(item),
                    })
                    return {};
                } else {
                    return new Tree(item, this, childrenKey, idKey, onStatusChange, rootPath, parentPath, cacheTrees);
                }
            }) : undefined;
        this.onStatusChange = onStatusChange;
        this.isSelected = NotSelect;
    }

    isLeaf() {
        return this.getChildren() === undefined;
    }
    isEqual(treeNode) {
        return this.getStringId() === treeNode.getStringId();
    }

    isFullSelect(cascade = true) {
        return this.selectStatus(cascade) === FullSelect;
    }
    isNotSelect(cascade = true) {
        return this.selectStatus(cascade) === NotSelect;
    }
    isIncompleteSelect(cascade = true) {
        return this.selectStatus(cascade) === IncompleteSelect;
    }

    selectStatus(cascade = true) {
        if (this.isLeaf() || !cascade) {
            return this.isSelected;
        } else {
            const leafCount = this.getLeafCount();
            if (leafCount === 0) {
                return this.isSelected;
            }
            const selectedLeafs = this.getSelectedLeafCount();
            if (leafCount > selectedLeafs) {
                if (selectedLeafs === 0) {
                    return NotSelect;
                } else {
                    return IncompleteSelect;
                }
            } else {
                const func = (treeNode) => {
                    if (treeNode.isLeaf()) {
                        return false;
                    } else if (treeNode.getLeafCount() === 0) {
                        return treeNode.isSelected === NotSelect;
                    } else {
                        return treeNode.getChildren()
                            .reduce((prv, cur) => prv || func(cur), false);
                    }
                };
                if (func(this)) {
                    return IncompleteSelect;
                } else {
                    return FullSelect;
                }
            }
        }
    }

    getDeepth(params = {}) {
        const {includeWeakNode = false} = params
        if (this.isLeaf()) {
            return 1;
        } else {
            return 1 + this.getChildren()
                .reduce((prv, cur) => {
                    let curDeepth = prv;
                    if (!(cur.getWeakParent().indexOf(this) >= 0 && !includeWeakNode)) {
                        curDeepth = cur.getDeepth(params);
                    } 
                    if (curDeepth > prv) {
                        return curDeepth;
                    } else {
                        return prv;
                    }
                }, 0);
        }
    }

    getInfo() {
        return this.root.info;
    }
    getId() {
        if (Array.isArray(this.idKey)) {
            let i = 0;
            while (i < this.idKey.length && !this.root.info[this.idKey[i]]) {
                i = i + 1;
            }
            return i >= this.idKey.length ? undefined : this.root.info[this.idKey[i]];
        } else {
            return this.root.info[this.idKey];
        }
    }
    getStringId() {
        return this._stringId(this.getId());
    }
    getParent() {
        return this.root[kParent];
    }
    getWeakParent() {
        return this.root[kWeakParent];
    }
    getChildren() {
        return this.root[kChild];
    }
    getPath() {
        return this.root.path;
    }

    getLeafChildren(params = {}) {
        const {includeWeakNode = false, tress = []} = params
        params = {includeWeakNode, tress};
        
        if (this.isLeaf()) {
            tress.push(this);
            return tress;
        } else {
            return this.getChildren()
                .reduce((prv, cur) => {
                    if (prv.indexOf(cur) >= 0) {
                        return prv;
                    } else if (cur.getWeakParent().indexOf(this) >= 0 && !includeWeakNode) {
                        return prv;
                    } else {
                        cur.getLeafChildren(params)
                        return prv;
                    }
                }, tress);
        }
    }

    getFullSelectChildren(cascade = true, params = {}) {
        const { includeWeakNode = false, tress = [] } = params;
        params = { includeWeakNode, tress };

        if (this.isFullSelect(cascade)) {
            tress.push(this);
        }
        if (!cascade || (cascade && this.isIncompleteSelect())) {
            !this.isLeaf() && this.getChildren()
                .reduce((prv, cur) => {
                    if (prv.indexOf(cur) >= 0) {
                        return prv;
                    } else if (cur.getWeakParent().indexOf(this) >= 0 && !includeWeakNode) {
                        return prv;
                    } else {
                        cur.getFullSelectChildren(cascade, params)
                        return prv;
                    }
                }, tress);
        }
        return tress
    }

    getLeafCount(params = {}) {
        const {includeWeakNode = false, tress = []} = params
        params = {includeWeakNode, tress};

        let count;
        if (this.isLeaf()) {
            tress.push(this);
            count = 1;
        } else {
            count = this.getChildren()
                .reduce((prv, cur) => {
                    if (tress.indexOf(cur) >= 0) {
                        return prv;
                    } else if (cur.getWeakParent().indexOf(this) >= 0 && !includeWeakNode) {
                        return prv;
                    } else {
                        return prv + cur.getLeafCount(params);;
                    }
                }, 0);
        }
        return count;
    }

    getSelectedLeafCount(params = {}) {
        const {includeWeakNode = false, tress = []} = params
        params = {includeWeakNode, tress};

        let count;
        if (this.isLeaf()) {
            tress.push(this);
            count = this.isFullSelect() ? 1 : 0;
        } else {
            count = this.getChildren()
                .reduce((prv, cur) => {
                    if (tress.indexOf(cur) >= 0) {
                        return prv;
                    } else if (cur.getWeakParent().indexOf(this) >= 0 && !includeWeakNode) {
                        return prv;
                    } else {
                        return prv + cur.getSelectedLeafCount(params);;
                    }
                }, 0);
        }
        return count;
    }

    setInitialState(selectedIds, cascade = true) {
        const result = [];
        if (Array.isArray(selectedIds) && selectedIds.length > 0) {
            selectedIds = selectedIds.map(item => this._stringId(item));
            const hasSelf = selectedIds.indexOf(this.getStringId()) >= 0;
            if (hasSelf) {
                this.update(cascade);
                result.push(this);
            }
            if (!this.isLeaf() && (!hasSelf || !cascade)) {
                this.getChildren().forEach(subNode => {
                    const r = subNode.setInitialState(selectedIds, cascade);
                    r.forEach(item => {
                        if(result.indexOf(item) < 0){
                            result.push(item)
                        } else {
                            item.update(cascade);
                        }
                    });
                });
            }
        }
        return result;
    }

    update(cascade = true) {
        if (this.isLeaf()) {
            this.isSelected = 1 - this.isSelected;
        } else {
            this.isSelected = this.selectStatus(cascade) < 1 ? 1 : 0;
            cascade && this.getChildren()
                .forEach(treeNode => treeNode._fromUpNotification(this.isSelected));
        }
        cascade && this.getParent() && this.getParent()._fromDownNotification();
        cascade && this.getWeakParent().forEach((item) => {
            item._fromDownNotification()
        })
        this._onStatusChange();
    }

    search(text, keys, multiselect, exactly = false, canSearch = true) {
        if (!exactly) {
            text = text.toLowerCase();
        }
        const result = [];
        if (canSearch) {
            const uniqueKeys = Array.from(new Set(keys));
            const isContain = uniqueKeys
                .some(key => this.root.info[key] && this.root.info[key].toLowerCase().indexOf(text) >= 0);
            if (isContain) {
                result.push(this);
            }
        }
        if (!this.isLeaf()) {
            this.getChildren()
                .forEach(child => {
                    const chresult = child.search(text, keys, multiselect, exactly);
                    chresult.forEach(item => {
                        if (result.indexOf(item) < 0) {
                            result.push(item)
                        }
                    });
                });
        }
        return result;
    }

    hasAncestor(ancestor) {
        const parent = this.getParent();
        if (parent) {
            return ancestor.getStringId() === parent.getStringId()
                || parent.hasAncestor(ancestor);
        } else {
            return false;
        }
    }

    findById(childId) {
        if (this.getStringId() === this._stringId(childId)) {
            return [this];
        } else if (this.isLeaf()) {
            return undefined;
        } else {
            return this.getChildren()
                .reduce((prv, cur) => {
                    const r = cur.findById(childId);
                    if (r) {
                        if (!prv) {
                            prv = [];
                        } 
                        r.forEach((item)=> {
                            if (prv.indexOf(item) < 0) {
                                prv.push(item);
                            }
                        })
                    }
                    return prv;
                }, undefined);
        }
    }

    _fromUpNotification(status) {
        this.isSelected = status;
        if (!this.isLeaf()) {
            this.getChildren().forEach(treeNode => treeNode._fromUpNotification(status));
        }
        this._onStatusChange();
    }

    _fromDownNotification() {
        this._onStatusChange();
        this.getParent() && this.getParent()._fromDownNotification();
        this.getWeakParent().forEach((item) => {
            item._fromDownNotification()
        })
    }

    _onStatusChange() {
        this.onStatusChange && this.onStatusChange(this);
    }

    _stringId(id) {
        if (id === undefined || id === null) {
            throw new Error('Identifier can not be null or undefined');
        }
        if (typeof id === 'string') {
            return id;
        }
        if (typeof id === 'number') {
            return String(id);
        }
        return JSON.stringify(id);
    }
};

export default InitTree;
