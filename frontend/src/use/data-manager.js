import { useApp } from "@/stores/app"
import { DATA_TYPES, useData } from '@/stores/data';
import { bin, deviation, min, mean, median, quadtree, scaleLinear, extent, group } from "d3"
import { circleIntersect, dataToNumbers, findInCircle, getAttr } from "./util"
import { Lens, LENS_TYPE } from "./Lens"

import MyWorker from '@/worker/feature-worker?worker'
import { LensSelection } from "./selection/selection";
import Annotation from "./annotation/annotation";
import { ENTRY_TYPE, ModifierEntry, TextEntry } from "./annotation/annotation-entry";
import { pick } from "./random"
import { ColorFunctionModifier, MODIFIER_TYPE } from "./annotation/modifiers"
import { updateData } from "./apis/data-api";

function calcStats(data, c, filterType) {
    const ord = filterType === DATA_TYPES.ORDINAL || filterType === DATA_TYPES.NOMINAL || filterType === DATA_TYPES.BOOLEAN
    const vals = dataToNumbers(data, c, filterType)
    let [minVal, maxVal] = extent(vals)
    let value = deviation(vals) / (maxVal - minVal)

    let unique = [], count = 0, countRel = 0
    if (ord) {
        if (filterType === DATA_TYPES.BOOLEAN) {
            unique = [false, true]
            count = vals.reduce((acc, v) => acc + (v ? 1 : 0), 0)
            countRel = count / vals.length
            value = count === 0 || count === vals.length ? 0 : 1 - countRel
        } else {
            const gr = group(data, d => getAttr(d, c))
            count = {}
            countRel = {}
            gr.forEach((list, name) => {
                count[name] = list.length
                countRel[name] = list.length / vals.length
                unique.push(name)
            })
            unique.sort((a, b) => a-b)
        }
    } else {
        const tmp = bin().thresholds(5)(vals)
        unique = tmp.map(d => d.x0) //.concat(tmp.at(-1).x1)
        count = tmp.map(d => d.length)
        countRel = tmp.map(d => d.length / vals.length)
    }
    return {
        min: min(vals),
        max: maxVal,
        bins: unique,
        count: count,
        countRel: countRel,
        mean: mean(vals),
        median: median(vals),
        value: value,
    }
}

const DEFAULT_DESC_OPTIONS = Object.freeze({
    columns: false,
    examples: true,
    numExamples: 5,
    statistics: true
})

const DEFAULT_ANNO_OPTIONS = Object.freeze({
    id: null, // annotation id
    selections: [], // list of selections
    useGlobal: false, // use active selections
})

class DataManager {

    constructor() {
        this.filterIds = new Set()
        this.callbacks = { lens: [], anno: [] }
        this.worker = null
        this.reset()
    }

    reset() {
        this.tree = null
        this.data = []
        this.columnsRaw = []
        this.columns = []
        this.types = []
        this.scales = {}
        this.getters = null

        this.stats = {}
        this.filterStats = {}
        this.filterIds.clear()

        this.lenses = []
        this.selections = []

        this.width = 0
        this.height = 0
        this.xAttr = ""
        this.yAttr = ""
        this.featureMaps = null
        this.lensMaps = null

        this.annotations = []
        if (this.globalAnno) {
            this.globalAnno.clear(false)
        } else {
            this.globalAnno = new Annotation([], [], "Notes", "G")
        }
        this.syncAnnotation(this.globalAnno)

        this.annoMap = {}
    }

    update(name="data") {
        // mark as updated
        const app = useApp()
        if (name === "data") {
            app.updateData()
        } else if (name === "anno") {
            app.updateAnno()
        }
    }

    describeData(datapoints=null, options=DEFAULT_DESC_OPTIONS) {
        const data = datapoints ? datapoints : this.data
        const opts = Object.assign(Object.assign({}, DEFAULT_DESC_OPTIONS), options)
        const result = { size: data.length }
        // add columns
        if (opts.columns) {
            result.columns = this.columns
        }
        if (data && data.length > 0) {
            // add examples
            if (opts.examples) {
                result.examples = opts.numExamples < data.length ?
                pick(data, opts.numExamples) :
                data
            }
            // add statistics
            if (opts.statistics) {
                result.statistics = this.describeDataStats(data)
            }
        }
        return result
    }

    describeDataStats(datapoints=null) {
        let stats = null

        if (datapoints) {
            stats = {}
            this.columns.forEach((c, i) => {
                stats[c] = calcStats(datapoints, c, this.types[i])
            })
        } else {
            stats = this.stats
        }

        const desc = {}
        Object.entries(stats).forEach(([name, obj]) => {
            desc[name] = {
                min: obj.min,
                max: obj.max,
                mean: obj.mean,
                median: obj.median,
                distribution: {}
            }
            obj.bins.forEach((b,i) => desc[name].distribution[b] = obj.countRel[i])
            return obj
        })

        return desc
    }

    setDataset(dsobj) {
        this.getters = dsobj.getters
    }

    addLens(radius, type=LENS_TYPE.RARE, active=true) {
        this.lenses.push(new Lens(radius, type, active))
        // TODO: add selection for lens
        this.selections.push(new LensSelection())
        return this.lenses.at(-1).id
    }

    updateLens(index, x, y, r, subset) {
        if (!this.lenses[index]) return
        this.lenses[index].apply(x, y, r, subset, this.columns, this.types)
        // TODO: update lens selection
        this.selections[index].update(x, y, r)
        this.selections[index].apply(this.tree)
        const app = useApp()
        app.numSelections = this.selections.reduce((acc, s) => acc + s.size, 0)
    }

    clearLens(index) {
        if (!this.lenses[index]) return
        this.lenses[index].reset()
        const app = useApp()
        app.numSelections = this.selections.reduce((acc, s) => acc + s.size, 0)
    }

    swapLenses(i, j) {
        if (!this.lenses[i] || !this.lenses[j]) return
        const tmp = this.lenses[i]
        const col = tmp.color
        this.lenses[i] = this.lenses[j]
        this.lenses[j] = tmp
        this.lenses[j].color = this.lenses[i].color
        this.lenses[i].color = col
        this.callbacks.lens.forEach(f => f())
    }

    hasLens(index) {
        return this.lenses[index] !== undefined
    }

    hasLensResult(index) {
        return this.lenses[index].getResultSize() > 0
    }

    onLens(callback) {
        this.callbacks.lens.push(callback)
    }

    onAnnotation(callback) {
        this.callbacks.anno.push(callback)
    }

    getLens(index) {
        if (!this.hasLens(index)) return null
        return this.lenses[index]
    }

    getLensIndex(id) {
        return this.lenses.findIndex(d => d.id === id)
    }

    getLensData(index) {
        if (!this.hasLens(index)) return []
        return this.lenses[index].getResultData()
    }

    getLensResults(index, mode) {
        if (!this.hasLens(index)) return []
        return this.lenses[index].getResult(mode)
    }

    getSelectionById(id) {
        return this.selections.find(d => d.id === id)
    }

    getColumnById(id) {
        return this.columnsRaw.find(d => d.id === id)
    }
    
    setColumns(rawColumns, columns, update=true) {
        this.columnsRaw = rawColumns
        this.columns = columns.map(d => d.name)
        this.types = columns.map(d => d.dtype)

        if (update) this.update()
    }

    setData(data, xAttr="x", yAttr="y", update=true) {
        this.data = data
        this.xAttr = xAttr
        this.yAttr = yAttr

        this.stats = {}
        // calculate stats
        if (this.columns) {
            this.columns.forEach((c, i) => this.stats[c] = calcStats(data, c, this.types[i]))
        }
        this.filterStats = this.stats

        if (update) this.update()
    }

    setSize(width=500, height=500, update=true) {
        this.width = width
        this.height = height

        if (this.data) {

            // scales for quadtree
            this.x = scaleLinear()
                .domain(extent(this.data, d => getAttr(d, this.xAttr)))
                .range([5, width-5])
            this.y = scaleLinear()
                .domain(extent(this.data, d => getAttr(d, this.yAttr)))
                .range([height-5, 5])
            
            // calculate quadtree
            this.tree = quadtree()
                .x(d => this.x(getAttr(d, this.xAttr)))
                .y(d => this.y(getAttr(d, this.yAttr)))
                .addAll(this.data)
            
            if (update) this.update()
        }
    }

    setAnnotations(annotations, update=true) {
        this.annotations = annotations.map(d => Annotation.fromJSON(d))
        if (update) this.update("anno")
    }

    getData(filter=true) {
        if (filter && this.filterIds.size > 0) {
            return this.data.filter(d => this.filterIds.has(d))
        }
        return this.data
    }

    resize(width, height) {
        if (!this.data || this.data.length === 0 || !this.x || !this.y) return
       
        let rx, ry;
        if (this.x && this.y) {
            rx = scaleLinear()
                .domain(this.x.range())
                .range([5, width-5])

            ry = scaleLinear()
                .domain(this.y.range())
                .range([height-5, 5])
        }

        this.setSize(width, height, false)

        if (rx && ry) {
            this.lenses.forEach((l, i) => {
                if (!l.x || !l.y) return
                const lx = rx(l.x), ly = ry(l.y)
                const points = this.findDataInCircle(lx, ly, l.radius)
                this.updateLens(i, lx, ly, l.radius, points)
            })
        }

        this.update()

        if (rx && ry) {
            this.callbacks.lens.forEach(f => f())
        }
    }

    computeFeatureMaps(radius, size=10, callback=null) {
        if (this.worker) this.worker.terminate()
        if (this.data.length === 0) return

        this.worker = new MyWorker();
        // set map upon completion
        this.worker.onmessage = e => {
            this.featureMaps = e.data.maps
            this.lensMaps = e.data.lenses
            this.worker = null
            if (callback) {
                callback(this.featureMaps)
            }
        }
        // compute feature maps in web worker
        this.worker.postMessage({
            columns: this.columns,
            types: this.types,
            data: this.data,
            stats: this.filterStats,
            width: this.width,
            height: this.height,
            radius: radius,
            size: size,
        })
    }

    recomputeFeatureMap(name, size=10, callback=null) {
        if (this.worker) this.worker.terminate()
        if (this.data.length === 0) return

        this.worker = new MyWorker();
        // set map upon completion
        this.worker.onmessage = e => {
            this.featureMaps[name] = e.data.maps[name]
            this.lensMaps[name] = e.data.lenses[name]
            this.worker = null
            if (callback) {
                callback(this.featureMaps[name])
            }
        }
        // compute feature maps in web worker
        this.worker.postMessage({
            columns: [name],
            types: [this.types[this.columns.indexOf(name)]],
            data: this.data,
            stats: this.filterStats,
            width: this.width,
            height: this.height,
            radius: this.lenses[0].radius,
            size: size,
        })
    }

    columnUpdate(name, size=10, callback=null) {
        const idx = this.columns.indexOf(name)
        if (idx >= 0) {
            this.stats[name] = calcStats(this.data, name, this.types[idx])
            this.recomputeFeatureMap(name, size, callback)
        }
    }

    computeFilterStats(ids) {
        this.filterIds = new Set(ids)
        if (ids.length === 0) {
            this.filterStats = this.stats
        } else {
            const data = this.data.filter(d => this.filterIds.has(d.id))
            this.columns.forEach((c, i) => this.filterStats[c] = calcStats(data, c, this.types[i]))
        }
    }

    getBestFeatures(lensType, mode) {
        if (!this.featureMaps) return []
        const cols = this.columns.slice()
        cols.sort((a, b) => this.featureMaps[a][mode+'Mean'] - this.featureMaps[b][mode+'Mean'])
        if (lensType === LENS_TYPE.RARE) {
            cols.reverse()
        }
        return cols
    }

    getMatchingLenses(x, y, r, lensIndex, mode, columnIndex) {
        if (!this.lensMaps || !this.lenses[lensIndex]) return []

        const lens = this.getLens(lensIndex)

        // get lens result
        const n = lens.getResultColumn(mode, columnIndex)
        const v = lens.getResultValue(mode, columnIndex)
        // return if there are no other lenses (doubt)
        if (!this.lensMaps[n] || this.lensMaps[n].length === 0) return []

        const vidx = mode === "local" ? 3 : 4
        const size = this.lenses[lensIndex].getResultSize()
        const lenses = this.lensMaps[n]
            .filter(d => !circleIntersect(x, y, r, d[0], d[1], r) && Math.abs(d[vidx]-v) < DM.filterStats[n].value)

        if (lenses.length === 0) return []

        lenses
            .sort((a, b) => {
                const vdiff = Math.abs(a[vidx]-v) - Math.abs(b[vidx]-v)
                return vdiff !== 0 ? vdiff : Math.abs(a[2]-size) - Math.abs(b[2]-size)
            })

        return [lenses[0]]
    }

    getMatchingAnnotations(limit=0) {
        const ids = this.selections[0].data

        if (limit === 1) {
            const match = this.annotations.find(d => d.hasDataOverlap(ids))
            return match ? match : []
        } else if (limit > 1) {
            const matches = []
            // add other annotations until the limit is reached
            for (let i = 0; i < this.annotations.length && matches.length <= limit; ++i) {
                const d = this.annotations[i]
                if (d.hasDataOverlap(ids)) {
                    matches.push(d)
                }
            }
            return matches
        } else {
            return this.annotations.filter(d => d.hasDataOverlap(ids))
        }
    }

    getGlobalAnnotation() {
        return this.globalAnno
    }

    findDataInCircle(x, y, radius) {
        return findInCircle(this.tree, x, y, radius)
    }

    setScales(scales={}) {
        this.scales = scales
    }

    getDataBy(filter) {
        return this.data.filter(filter)
    }

    trigger(name) {
        if (this.callbacks[name]) {
            this.callbacks[name].forEach(f => f())
        }
    }

    createEmptyAnnotation(label="A1", selections=null) {
        let ids = new Set()
        if (selections !== null) {
            selections.forEach(s => {
                ids = ids.union(s.data)
                s.calculatePolygon(this.data, this.xAttr, this.yAttr, this.x, this.y)
            })
        }
        return new Annotation(ids, this.selections.map(s => s.copy()), "Annotation", label)
    }

    createAnnotationFromOptions(options=DEFAULT_ANNO_OPTIONS) {
        const opts = Object.assign(Object.assign({}, DEFAULT_ANNO_OPTIONS), options)
        if (opts.id !== null && opts.id !== undefined) {
            // use a specific existing annotation
            return this.getAnnotationById(opts.id)
        } else if (opts.useGlobal) {
            // use the global annotation
            return this.globalAnno
        } else if (opts.selections && opts.selections.length > 0) {
            // use the given selections for a new annotation
            return this.createEmptyAnnotation(
                `A${this.annotations.length+1}`,
                opts.selections
            )
        } else {
            // use the active selections for a new annotation
            return this.createEmptyAnnotation(
                `A${this.annotations.length+1}`,
                this.selections
            )
        }
    }

    addAnnotation(anno, update=true) {
        if (anno.id !== this.globalAnno.id) this.annotations.push(anno)
        this.syncAnnotation(anno.id)
        if (update) this.callbacks.anno.forEach(f => f(anno))
        return anno
    }

    async sync() {
        return Promise.all([this.syncSelections(), this.syncAnnotations()])
    }

    async syncAnnotation(anno) {
        try {
            const dstore = useData()
            const json = anno.toJSON()
            json.dataset_id = dstore.datasetId
            json.group_id = anno.id
            const res = await updateData("annotation", json)
            if (res.id) anno.id = res.id
            console.log("synched anno", anno.id)
        } catch(e) {
            console.error(e.toString())
        }

        return anno
    }

    async syncAnnotations() {
        const dstore = useData()
        return Promise.all(this.annotations.map(async (anno) => {
            const json = s.toJSON()
            json.dataset_id = dstore.datasetId
            json.group_id = anno.id
            const res = await updateData("annotation", json)
            if (res.id) anno.id = res.id
            console.log("synched anno", anno.id)
        }))
    }

    async syncAnnotationEntry(entry) {
        try {
            const dstore = useData()
            const json = entry.toJSON()
            json.dataset_id = dstore.datasetId
            const res = await updateData("anno_entry", json)
            if (res.id) entry.id = res.id
            console.log("synched anno entry", entry.id)
        } catch(e) {
            console.error(e.toString())
        }

        return entry
    }

    async syncSelection(selection) {
        try {
            const dstore = useData()
            const json = selection.toJSON()
            json.dataset_id = dstore.datasetId
            const res = await updateData("group", json)
            if (res.id) selection.id = res.id
            console.log("synched selection", selection.id)
        } catch(e) {
            console.error(e.toString())
        }
        
        return selection
    }

    async syncSelections() {
        const dstore = useData()
        return Promise.all(this.selections.map(async (s) => {
            const json = s.toJSON()
            json.dataset_id = dstore.datasetId
            const res = await updateData("group", json)
            if (res.id) s.id = res.id
            console.log("synched selection", s.id)
        }))
    }

    annotateEmpty(selections=null) {
        return this.addAnnotation(this.createEmptyAnnotation(
            `A${this.annotations.length+1}`,
            selections
        ))
    }

    annotateText(text, src, entities=[], options=DEFAULT_ANNO_OPTIONS) {
        const target = this.createAnnotationFromOptions(options)
        if (target) {
            const entry = new TextEntry(target, text, src, entities)
            if (target.id === this.globalAnno.id) {
                target.addEntry(entry)
            } else {
                target.addEntry(entry, false)
                this.addAnnotation(target)
            }
            // return the created entry
            return entry
        }

        return null
    }

    annotateModifier(text, src, entities, options=DEFAULT_ANNO_OPTIONS) {

        const target = this.createAnnotationFromOptions(options)

        if (target) {
            const entry = new ModifierEntry(target, text, src, entities)
            const modifier = new ColorFunctionModifier(entry, entities)
            entry.setModifier(modifier)
            if (target.id === this.globalAnno.id) {
                target.addEntry(entry)
            } else {
                target.addEntry(entry, false)
                this.addAnnotation(target)
            }
            // return the created entry
            return entry
        }

        return null
    }

    /**
     * Actions to execute (globally) when an entry is added
     * @param {Entry} entry 
     */
    onAddEntry(entry) {
        if (entry.type === ENTRY_TYPE.MODIFIER) {
            const modifier = entry.getModifier()
            modifier.applyAll(this.data)

            const app = useApp()
            app.setColorOverride(modifier.type)
            app.scales[MODIFIER_TYPE.COLOR_FUNCTION] = modifier.colormap
            
            this.columnUpdate(modifier.type, 10, function() {
                const now = Date.now()
                app.featureTime = now
                app.lensTime = now
            })
        }
    }

    /**
     * Actions to execute (globally) when an entry is removed
     * @param {Entry} entry 
     */
    onRemoveEntry(entry) {
        if (entry.type === ENTRY_TYPE.MODIFIER) {
            const modifier = entry.getModifier()
            modifier.resetAll(this.data)

            const app = useApp()
            app.setColorOverride("")
            
            this.columnUpdate(modifier.type, 10, function() {
                const now = Date.now()
                app.featureTime = now
                app.lensTime = now
            })
        }
    }

    checkAnnoMerges() {
        const merged = new Set()

        for (let i = 0; i < this.annotations.length-1; ++i) {
            const a = this.annotations[i]
            if (merged.has(a.id)) continue

            const idsA = new Set(a.ids)
            const toMerge = []
            for (let j = i+1; j < this.annotations.length; ++j) {
                const b = this.annotations[j]
                if (merged.has(b.id)) continue

                const int = idsA.intersection(new Set(b.ids))
                if (int.size === idsA.size || int.size > 0 &&
                    a.columns.length === b.columns.length &&
                    a.columns[0].name === b.columns[0].name
                ) {
                    toMerge.push(b)
                    merged.add(b.id)
                }
            }

            const newAnno = this._merge(a, toMerge)

            a.x = newAnno.x
            a.y = newAnno.y
            a.polygon = newAnno.polygon
            a.centroid = newAnno.centroid
            a.columns = newAnno.columns
            a.color = newAnno.color
            a.ids = newAnno.ids
        }

        if (merged.size > 0) {
            this.annotations = this.annotations.filter(d => !merged.has(d.id))
            this.callbacks.anno.forEach(f => f())
        }
    }

    mergeAnnotations(idA, idB) {
        const a = this.annotations.find(d => d.id === idA)
        const b = this.annotations.find(d => d.id === idB)
        if (a && b && idA !== idB) {
            // merge these two annotations
            const newAnno = this._merge(a, [b])
            // update annotation a
            a.x = newAnno.x
            a.y = newAnno.y
            a.polygon = newAnno.polygon
            a.centroid = newAnno.centroid
            a.columns = newAnno.columns
            a.color = newAnno.color
            a.ids = newAnno.ids

            // remove annotation b from list
            this.annotations = this.annotations.filter(d => d.id !== idB)
            // call anno callbacks
            this.callbacks.anno.forEach(f => f())
        }
    }

    _merge(a, others) {

        let idSet = new Set(a.ids)
        let mergeCols = a.columns
        const colSet = new Map(mergeCols.map(d => ([d.name, d.value])))
        const colCounts = new Map()
        mergeCols.forEach(c => colCounts.set(c.color, (colCounts.get(c.color) || 0) + 1))

        others.forEach(b => {
            idSet = idSet.union(new Set(b.ids))
            b.columns.forEach(c => {
                delete this.annoMap[c.name][b.id]
                if (colSet.has(c.name)) {
                    colCounts.set(c.color, (colCounts.get(c.color) || 0) + 1)
                } else {
                    mergeCols.push({ name: c.name, color: c.color, value: c.value })
                    colCounts.set(c.color, (colCounts.get(c.color) || 0) + 1)
                    colSet.set(c.name, c.value)
                }
            })
        })

        let annoColor, maxCount = 0;
        colCounts.forEach((theCount, theColor) => {
            if (theCount > maxCount) {
                annoColor = theColor;
                maxCount = theCount
            }
        })

        const points = this.data.filter(d => idSet.has(d.id)).map(d => ([this.x(getAttr(d, this.xAttr)), this.y(getAttr(d, this.yAttr))]))
        const { polygon, centroid } = this._makePolygon(points)

        mergeCols.forEach(c => {
            const n = c.name
            if (!this.annoMap[n]) {
                this.annoMap[n] = {}
            }
            this.annoMap[n][a.id] = true
        })

        return {
            id: a.id,
            mode: a.mode,
            lensType: a.lensType,
            color: a.color,
            x: mean(centroid, c => c[0]),
            y: mean(centroid, c => c[1]),
            polygon: polygon,
            centroid: centroid,
            columns: mergeCols,
            color: annoColor,
            ids: Array.from(idSet.values())
        }
    }

    removeAnnotation(id) {
        const idx = this.annotations.findIndex(d => d.id === id)
        if (idx >= 0) {
            // this.annotations[idx].columns.forEach(c => {
            //     delete this.annoMap[c.name][id]
            // })
            this.annotations.splice(idx, 1)
            for (let i = idx; i < this.annotations.length; ++i) {
                this.annotations[i].label = `A${i+1}`
            }
            this.callbacks.anno.forEach(f => f())
            // this.checkAnnoMerges()
        }
    }

    getAnnotations() {
        return this.annotations
    }

    getAnnotationById(id) {
        if (this.globalAnno.id === id) return this.globalAnno
        return this.annotations.find(d => d.id === id)
    }

    getAnnotationByLabel(label) {
        if (this.globalAnno.label === label) return this.globalAnno
        return this.annotations.find(d => d.label === label)
    }

    getAnnotationEntryById(id) {
        const ge = this.globalAnno.getEntry(id)
        if (ge) return ge
        for (let i = 0; i < this.annotations.length; ++i) {
            const ae = this.annotations[i].getEntry(id)
            if (ae) return ae
        }
        return null
    }

    clearAnnotations() {
        this.annoMap = {}
        this.annotations = []
        this.callbacks.anno.forEach(f => f())
    }

    getAnnotationConnections() {
        const nodes = []
        const links = []
        const added = new Set()
        const linksAdded = new Map()

        this.annotations.forEach(ia => {

            const counts = new Map()
            ia.columns.forEach(c => {
                for (const id in this.annoMap[c.name]) {
                    if (id === ia.id) continue
                    if (!added.has(id)) {
                        const ib = this.annotations.find(d => d.id === +id)
                        if (!ib) continue
                        nodes.push({ id: +id, name: "anno "+id, x: ib.x, y: ib.y })
                        added.add(+id)
                    }
                    counts.set(+id, (counts.get(+id) || 0) + 1)
                }
            })

            if (counts.size > 0) {
                if (!added.has(ia.id)) {
                    nodes.push({ id: ia.id, name: "anno "+ia.id, x: ia.x, y: ia.y })
                    added.add(ia.id)
                }
                counts.forEach((value, id) => {
                    let map = linksAdded.get(id)
                    if (!map || !map.has(ia.id)) {
                        links.push({
                            source: ia.id,
                            target: id,
                            value: value
                        })
                        if (!map) {
                            map = new Set()
                        }
                        map.add(ia.id)
                        linksAdded.set(id, map)
                    }
                })
                linksAdded.set(ia.id, new Set(counts.keys()))
            }
        })

        return { nodes: nodes, links: links }
    }
}

const DM = new DataManager()

export { DM as default }