import { mean, polygonContains } from "d3";
import { findInCircle, getAttr } from "../util";
import { makePolygon } from "./polygon";

let _SEL_ID = 1;

export const SELECTION_TYPE = Object.freeze({
    BASE: 1,
    LENS: 2,
    LASSO: 3,
})

export class Selection {

    constructor(data=[], type=SELECTION_TYPE.BASE, id=null) {
        this.id = id ?? `${_SEL_ID++}_sel`
        this.type = type
        this.data = new Set(data)

        this.x = 0
        this.y = 0
        this.polygon = []
        this.centroid = []
    }

    static fromJSON(json) {
        // TODO: save which kind of selection we have
        return new BrushSelection(json.ids)
    }

    static dataUnion(selections) {
        if (selections.length === 1) return selections[0]
        let int = new Set()
        selections.forEach(s => int = int.union(s.data))
        return new Selection(SELECTION_TYPE.NONE, int)
    }

    static dataIntersection(selections) {
        if (selections.length === 1) return selections[0]
        let int = new Set()
        selections.forEach(s => int = int.intersection(s.data))
        return new Selection(SELECTION_TYPE.NONE, int)
    }

    toJSON() {
        return {
            "id": this.id,
            "type": this.type,
            "ids": Array.from(this.data)
        }
    }

    get size() {
        return this.data.size
    }

    union(ids) {
        return this.data.union(ids)
    }

    intersection(ids) {
        return this.data.intersection(ids)
    }

    difference(ids) {
        return this.data.difference(ids)
    } 

    copy() {
        const s = new Selection(this.type, this.data)
        s.x = this.x
        s.y = this.y
        s.polygon = this.polygon.map(p => p.slice())
        s.centroid = this.centroid.map(c => c.slice())
        return s
    }

    calculatePolygon(data, xAttr, yAttr, x, y) {
        if (this.data.size > 0) {
            const xy = data.filter(d => this.data.has(d.id)).map(d => ([x(getAttr(d, xAttr)), y(getAttr(d, yAttr))]))
            if (xy.length > 0) {
                const { polygon, centroid } = makePolygon(xy)
                this.x = mean(centroid, c => c[0])
                this.y = mean(centroid, c => c[1])
                this.centroid = centroid
                this.polygon = polygon
                return
            }
        }
        // default values
        this.x = 0
        this.y = 0
        this.centroid = []
        this.polygon = []
    }

    filter(data) {
        return data.filter(d => this.data.has(d.id))
    }

    empty() {
        return this.data.length === 0
    }
}

export class LensSelection extends Selection {

    constructor(x=0, y=0, r=30, data=[]) {
        super(data, SELECTION_TYPE.LENS)
        this.update(x, y, r)
    }

    copy() {
        const s = new LensSelection(this.x, this.y, this.r, this.data)
        s.polygon = this.polygon.map(p => p.slice())
        s.centroid = this.centroid.map(c => c.slice())
        return s
    }

    update(x, y, r) {
        this.x = x
        this.y = y
        this.r = r
    }

    apply(tree) {
        const points = findInCircle(tree, this.x, this.y, this.r)
        this.data = new Set(points.map(d => d.id))
    }
}


export class LassoSelection extends Selection {

    constructor(data=[], lasso=[]) {
        super(data, SELECTION_TYPE.LASSO)
        this.lasso = lasso
    }
    
    copy() {
        const s = new LassoSelection(this.data, this.lasso.slice())
        s.x = this.x
        s.y = this.y
        s.polygon = this.polygon.map(p => p.slice())
        s.centroid = this.centroid.map(c => c.slice())
        return s
    }

    apply(tree) {
        const points = findInCallback(tree, (x, y) => this.polygon.some(p => polygonContains(p, [x, y])))
        this.data = new Set(points.map(d => d.id))
    }
}
