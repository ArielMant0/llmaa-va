import { extent, interpolateViridis, scaleLinear, scaleSequential } from "d3"
import { getAttr } from "../util"
import { Entity, ENTITY_TYPE } from "./entity"

export const MODIFIER_TYPE = Object.freeze({
    COLOR_FUNCTION: "_mod_col",
})
export const MODIFIER_COLUMNS = Object.values(MODIFIER_TYPE)

let _MOD_ID = 1

export class Modifier {

    constructor(entry, type) {
        this._entry = entry
        this.id = `${_MOD_ID++}_mod`
        this.type = type
    }

    applyAll() {
        throw new Error("called abstract method")
    }

    addEntity(entity) {
        this.entities.push(entity)
    }

    removeEntity(id) {
        const idx = this.entities.findIndex(d => d.id === id)
        if (idx >= 0) {
            this.entities.splice(idx, 1)
            this._entry.removeEntity(id)
            return true
        }
        return false
    }

}

const DEFAULT_CF_OPTIONS = Object.freeze({
    scale: scaleSequential,
    colors: interpolateViridis,
    domain: [0, 1]
})

export class ColorFunctionModifier extends Modifier {

    /**
     * Create a new color function modifier that creates a colormap based
     * on column weights (or sth else?)
     * @param {Entity[]} entities
     * @param {Function} colors
     */
    constructor(entry, entities, options=DEFAULT_CF_OPTIONS) {
        super(entry, MODIFIER_TYPE.COLOR_FUNCTION)
        this.entities = entities
        this.options = Object.assign(Object.assign({}, DEFAULT_CF_OPTIONS), options)
        this.colormap = this.options.scale(this.options.colors).domain(this.options.domain)
    }


    getColormap() {
        return this.colormap
    }

    readDomain(data) {
        this.options.domain = extent(data, d => getAttr(d, this.type))
        this.colormap.domain(this.options.domain)
    }

    applyAll(data) {
        // color points based on a weighted linear combination of their feature values
        if (this.entities.length > 0 && this.entities.at(0).type === ENTITY_TYPE.COLUMN) {
            const scaling = {}
            this.entities.forEach(c => {
                const domain = extent(data, d => getAttr(d, c.name))
                scaling[c.name] = scaleLinear()
                    .domain(domain)
                    .range([0, 1])
            })

            data.forEach(d => {
                d[this.type] = this.entities.reduce((acc, c) => {
                    return acc + scaling[c.name](getAttr(d, c.name)) * c.value
                }, 0)
            })
            this.readDomain(data)
        }
    }

    resetAll(data) {
        if (this.entities.length > 0 && this.entities.at(0).type === ENTITY_TYPE.COLUMN) {
            data.forEach(d => d[this.type] = 0)
            this.colormap.domain(this.options.domain)
        }
    }
}