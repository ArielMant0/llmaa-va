import { DATA_TYPES } from "@/stores/data"
import { dataToNumbers, getAttr } from "./util"
import { bin, deviation, extent, group, mean, median, min, quadtree, scaleLinear } from "d3"

function calcStats(data, c, filterType) {
    const ord = filterType === DATA_TYPES.ORDINAL ||
        filterType === DATA_TYPES.NOMINAL ||
        filterType === DATA_TYPES.BOOLEAN

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

export function useDatabase() {

    const dataTime = ref(0)

    const types = ref([])
    const columns = ref([])
    const rawColumns = ref([])

    const xAttr = ref("")
    const yAttr = ref("")

    const width = ref(1)
    const height = ref(1)

    const scales = {
        x: null,
        y: null
    }

    let data = []
    let tree = null

    let stats = {}
    let filterStats = {}


    function get(id=null) {
        return id ? data.find(d => d.id === id) : data
    }

    function getBy(callback) {
        return data.filter(callback)
    }

    function setColumns(cols, raw, update=true) {
        rawColumns.value = raw
        columns.value = cols.map(d => d.name)
        types.value = cols.map(d => d.dtype)
        if (update) update()
    }

    function setData(list, x="x", y="y", update=true) {
        data = list
        xAttr.value = x
        yAttr.value = y

        stats = {}
        if (columns.value) {
            columns.value.forEach((c, i) => stats[c] = calcStats(data, c, types.value[i]))
        }
        filterStats = stats

        if (update) update()
    }

    function setSize(w=500, h=500, update=true) {
        width.value = w
        height.value = h

        if (data) {

            // scales for quadtree
            scales.x = scaleLinear()
                .domain(extent(this.data, d => getAttr(d, xAttr.value)))
                .range([5, width-5])
            scales.y = scaleLinear()
                .domain(extent(this.data, d => getAttr(d, yAttr.value)))
                .range([height-5, 5])
            
            // calculate quadtree
            tree = quadtree()
                .x(d => scales.x(getAttr(d, xAttr.value)))
                .y(d => scales.y(getAttr(d, yAttr.value)))
                .addAll(data)
            
            if (update) update()
        }
    }

    function update() {
        dataTime.value = Date.now()
    }

    return {
        dataTime,

        // not reactive
        data,
        tree,
        stats,
        scales,

        // reactive
        xAttr,
        yAttr,
        columns,
        rawColumns,
        types,
        width,
        height,

        get,
        getBy,
        setColumns,
        setData,
        setSize,
        update
    }
}