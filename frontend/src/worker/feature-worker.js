import { calcDeviation, findInCircle } from "@/use/util";
import { extent, quadtree, scaleLinear, mean } from "d3";

onmessage = (e) => {
    console.debug("Message received from main script");
    postMessage(calc(
        e.data.columns,
        e.data.types,
        e.data.data,
        e.data.stats,
        e.data.width,
        e.data.height,
        e.data.radius,
        e.data.size)
    );
};

function calc(columns, types, sourcedata, stats, width, height, radius, size) {
    const n = Math.floor(width / size)
    const m = Math.floor(height / size)

    const maps = {}
    const lenses = {}

    const x = scaleLinear()
        .domain(extent(sourcedata, d => d.x))
        .range([0, width])
    const y = scaleLinear()
        .domain(extent(sourcedata, d => d.y))
        .range([height, 0])

    // calculate quadtree
    const tree = quadtree()
        .x(d => x(d.x))
        .y(d => y(d.y))
        .addAll(sourcedata)

    // calculate a map for each feature
    // (local vs. global, rare vs. frequent)
    columns.forEach((c, k) => {

        const dl = new Map(), dg = new Map()
        const dc = new Map()
        let minLocal = Number.MAX_VALUE, maxLocal = Number.MIN_VALUE
        let minGlobal = Number.MAX_VALUE, maxGlobal = Number.MIN_VALUE

        const lensValues = []

        for (let i = 0; i < n; ++i) {
            for (let j = 0; j < m; ++j) {
                const data = findInCircle(tree, i*size, j*size, radius)
                if (data.length === 0) continue

                const [l, g] = calcDeviation(data, c, types[k], stats)
                if (!Number.isNaN(l) && !Number.isNaN(g)) {
                    lensValues.push([i*size, j*size, data.length, l, g])
                    data.forEach(d => {
                        const vl = (dl.get(d.id) || 0) + l, vg = (dg.get(d.id) || 0) + g
                        dl.set(d.id, vl)
                        dg.set(d.id, vg)
                        dc.set(d.id, (dc.get(d.id) || 0) + 1)
                        // remember min/max values
                        minLocal = Math.min(vl, minLocal)
                        maxLocal = Math.max(vl, maxLocal)
                        minGlobal = Math.min(vg, minGlobal)
                        maxGlobal = Math.max(vg, maxGlobal)
                    })
                }
            }
        }

        // normalize
        dc.forEach((count, id) => {
            dl.set(id, dl.get(id) / count)
            dg.set(id, dg.get(id) / count)
        })

        maps[c] = {
            local: dl,
            global: dg,
            localMin: minLocal,
            localMax: maxLocal,
            localMean: mean(dl.values()),
            globalMin: minGlobal,
            globalMax: maxGlobal,
            globalMean: mean(dg.values()),
        }

        lenses[c] = lensValues
    })

    return { maps: maps, lenses: lenses }
}