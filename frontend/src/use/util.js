import { DATA_TYPES, useData } from '@/stores/data';
import { bin, deviation, extent, group, interpolatePlasma, scaleOrdinal, scaleQuantile, scaleSequential, schemeBlues, schemeCategory10, schemeOrRd } from "d3";
import DM from "./data-manager";
import { AnnotationEntryEntity, ColumnEntity } from "./annotation/entity";

let _UID = 1;

export function getDataType(d, name) {
    const dstore = useData()
    if (dstore.dataset.types && dstore.dataset.types[name]) {
        return dstore.dataset.types[name]
    }
    const v = getAttr(d, name)
    switch (typeof v) {
        case "boolean":
            return DATA_TYPES.BOOLEAN
        case 'string':
            return DATA_TYPES.NOMINAL
        default:
        case 'number':
            return DATA_TYPES.SEQUENTIAL
    }
}

export function dataToNumbers(data, column, type) {
    let vals = [];
    switch (type) {
        case DATA_TYPES.BOOLEAN:
            vals = data.map(d => getAttr(d, column) === true ? 1 : 0)
            break
        case DATA_TYPES.NOMINAL:
        case DATA_TYPES.ORDINAL:
            const list = Array.from(new Set(data.map(d => getAttr(d, column))).values())
            const n = new Map(list.map((v, i) => ([v, i])))
            vals = data.map(d => n.get(getAttr(d, column)))
            break
        case DATA_TYPES.QUANTILE:
        case DATA_TYPES.INTEGER:
        case DATA_TYPES.SEQUENTIAL:
            vals = data.map(d => getAttr(d, column))
            break
    }
    return vals.filter(d => Number.isFinite(d) && !Number.isNaN(d))
}

export function makeColorScale(data, column, type, primary="blue") {
    switch(type) {
        case DATA_TYPES.BOOLEAN: {
            return scaleOrdinal(["lightgrey", primary]).domain([false, true]).unknown("red")
        }
        case DATA_TYPES.QUANTILE:
            return scaleQuantile(data.map(d => getAttr(d, column)), schemeOrRd[6]).unknown("black")
        case DATA_TYPES.INTEGER:
        case DATA_TYPES.SEQUENTIAL:
            return scaleSequential(interpolatePlasma)
                .unknown("black")
                .domain(extent(data, d => getAttr(d, column)))
        case DATA_TYPES.ORDINAL: {
            const tmp = group(data, d => getAttr(d, column))
            const dom = Array.from(tmp.keys())
            dom.sort((a, b) => a-b)
            return scaleOrdinal(schemeBlues[Math.min(dom.length, 9)]).domain(dom).unknown("black")
        }
        default:
        case DATA_TYPES.NOMINAL: {
            const tmp = group(data, d => getAttr(d, column))
            const dom = Array.from(tmp.keys())
            dom.sort((a, b) => a-b)
            return scaleOrdinal(schemeCategory10).domain(dom).unknown("black")
        }
    }
}

export function getAttr(d, name) {
    let acc = name;

    if (DM.getters && DM.getters[name]) {
        acc = DM.getters[name]
    }

    switch (typeof acc) {
        case "number":
        case "string": {
            const segs = acc.split(".")
            if (segs.length === 1) {
                return d[acc]
            }
            let val = d;
            segs.forEach(s => val = val[s])
            return val
        }
        case "object": return d[acc].length
        case "function": return acc(d)
        default: return null
    }
}

export function calcHistogram(data, column, type, stats, scale) {
    switch(type) {
        case DATA_TYPES.BOOLEAN:
        case DATA_TYPES.NOMINAL:
        case DATA_TYPES.ORDINAL: {
            const tmp = group(data, d => getAttr(d, column))
            const list = []
            stats[column].bins.map(c => {
                const values = tmp.get(c)
                list.push({ x: c, y: values ? values.length / data.length : 0, color: scale(c) })
            })
            list.sort((a, b) => a.x - b.x)
            return list
        }
        default:
        case DATA_TYPES.SEQUENTIAL: {
            const tmp = bin()
                .thresholds(stats[column].bins.length)
                .domain([stats[column].min, stats[column].max])
                .value(d => getAttr(d, column))
                (data)

            const list = []
            tmp.forEach(d => list.push({ x: d.x0, x1: d.x1, y: d.length / data.length, color: scale(d.x0) }))
            return list
        }
    }
}

export function calcDeviation(data, column, type, stats, none=NaN) {
    let vd, gl

    if (type === DATA_TYPES.BOOLEAN) {
        const vals = dataToNumbers(data, column, type)
        const count = vals.reduce((acc, v) => acc + (v ? 1 : 0), 0)
        const noneOrAll = count === 0
        vd = noneOrAll ? none : 1 - count / vals.length
        gl = noneOrAll ? none : Math.abs((count / vals.length) - stats[column].countRel)
        // count / stats[column].count // + 0.1 * count / vals.length
    } else if (type === DATA_TYPES.ORDINAL || type === DATA_TYPES.NOMINAL) {
        const count = group(data, d => getAttr(d, column))
        vd = 0, gl = 0
        count.forEach((list, name) => {
            vd += 1 - list.length / data.length
            gl += Math.abs((list.length / data.length) - stats[column].countRel[name])
        })
        vd = vd / count.size
    } else {
        const vals = dataToNumbers(data, column, type)
        vd = deviation(vals) / (stats[column].max - stats[column].min)

        const tmp = bin()
            .thresholds(stats[column].bins.length)
            .domain([stats[column].min, stats[column].max])
            (vals)

        gl = tmp.reduce((acc, d, i) => {
            if (vals.length > 0 && stats[column].countRel > 0) {
                return acc + Math.abs((d.length / vals.length) - stats[column].countRel[i])
            }
            if (stats[column].countRel[i] > 0 ) {
                return acc + stats[column].countRel[i]
            }
            return acc + 0
        }, 0) / Math.max(1, stats[column].count.reduce((acc, d) => acc + (d.length > 0 ? 1 : 0), 0))
    }

    return [vd, gl]
}


export function findInCircle(tree, px, py, r) {
    const result = [], radius2 = r * r
    tree.visit(function(node, x1, y1, x2, y2) {
        if (node.length) {
            return x1 >= px + r || y1 >= py + r || x2 < px - r || y2 < py - r
        }

        const dx = +tree._x.call(null, node.data) - px,
            dy = +tree._y.call(null, node.data) - py

        if (dx * dx + dy * dy < radius2) {
            do { result.push(node.data) } while (node = node.next)
        }
    });

    return result;
}

export function findInCallback(tree, callback) {
    const result = []
    tree.visit(function(node, x1, y1, x2, y2) {
        if (node.length) {
            return !callback(x1, y1) && !callback(x2, y2)
        }

        const dx = +tree._x.call(null, node.data)
        const dy = +tree._y.call(null, node.data)

        if (callback(dx, dy)) {
            do { result.push(node.data) } while (node = node.next);
        }
    });

    return result;
}

export function circleIntersect(x0, y0, r0, x1, y1, r1) {
    return Math.hypot(x0 - x1, y0 - y1) <= r0 + r1;
}

export function deg2rad(degree) {
    return degree * Math.PI / 180
}

export function rad2deg(radian) {
    return radian * 180 / Math.PI
}

export function euclidean(x0, y0, x1, y1) {
    return Math.sqrt((x0 - x1)**2 + (y1 - y0)**2)
}

export function capitalize(str) {
    if (!str || str.length === 0) return ""
    return str[0].toUpperCase() + (str.length > 1 ? str.slice(1, str.length) : "")
}

export function uid(namespace="u_") {
    return namespace+(_UID++)
}

export function parseEntities(response) {
    let entities = []

    if (response.columns) {
        entities = response.columns.map(id => {
            const col = DM.getColumnById(id)
            return col ? new ColumnEntity(col, col.name) : null
        })
    }

    if (response.columns_weights) {
        for (const id in response.columns_weights) {
            const col = DM.getColumnById(id)
            if (col) {
                const existing = entities.find(d => d.id === id)
                if (existing) {
                    existing.value = response.columns_weights[id]
                } else {
                    entities.push(new ColumnEntity(col, col.name, response.columns_weights[id]))
                }
            }
            
        }
    }

    // TODO: parse groups/selections
    // if (response.groups) {
    //     entities = entities.concat(response.datapoints.map(d => new DatapointEntity(d)))
    // }
    
    if (response.annotations) {
        response.annotations.forEach(eid => {
            const entry = DM.getAnnotationEntryById(eid)
            const anno = entry._anno
            if (entry) {
                entities.push(new AnnotationEntryEntity(entry, anno.label))
            }
        })
    }

    return entities.filter(d => d !== null)
}
