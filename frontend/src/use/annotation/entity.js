import { useAnnotations } from "../use-annotations"
import { useDatabase } from "../use-database"
import { useSelections } from "../use-selections"
import { ACTION_TARGET } from "./action-target"

export const ENTITY_TYPE = Object.freeze({
    DATAPOINT: "dp",
    SELECTION: "sel",
    COLUMN: "col",
    ANNOTATION: "anno",
})

export function entityTypeToValue(type) {
    switch(type) {
        case ENTITY_TYPE.ANNOTATION: return 1
        case ENTITY_TYPE.COLUMN: return 2
        case ENTITY_TYPE.SELECTION: return 3
        default:
        case ENTITY_TYPE.DATAPOINT: return 4
    }
}

export function compareEntityType(a, b) {
    return entityTypeToValue(a) - entityTypeToValue(b)
}

export class Entity {

    constructor(target, targetType, type) {
        this.target = target
        this.targetType = targetType
        this.type = type
        this.name = "entity " + this.id
    }

    get id() {
        return this.target.id
    }

    static fromJSON(json) {
        const sels = useSelections()
        const db = useDatabase()
        const anno = useAnnotations()
        switch (json.type) {
            case ENTITY_TYPE.SELECTION:
                const selection = sels.get(json.id)
                return new SelectionEntity(selection, json.name)
            case ENTITY_TYPE.COLUMN:
                const column = db.getColumn(json.id)
                return new ColumnEntity(column, json.name, json.value)
            case ENTITY_TYPE.ANNOTATION:
                const entry = anno.getEntry(json.id)
                return new AnnotationEntryEntity(entry, json.name)
            case ENTITY_TYPE.DATAPOINT:
                const dp = db.get(json.id)
                return new DatapointEntity(dp, json.values)
        }
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name
        }
    }
}


export class SelectionEntity extends Entity {

    constructor(selection, name) {
        super(selection, ACTION_TARGET.SELECTION, ENTITY_TYPE.SELECTION)
        this.name = name
    }
}

export class DatapointEntity extends Entity {

    constructor(datapoint, values=null) {
        super(datapoint, ACTION_TARGET.DATAPOINT, ENTITY_TYPE.DATAPOINT)
        this.name = datapoint.name ? datapoint.name : `data point ${datapoint.id}`
        this.values = values
    }

    toJSON() {
        const json = super.toJSON()
        json.values = this.values
        return json
    }
}

export class ColumnEntity extends Entity {

    constructor(column, name, value=null) {
        super(column, ACTION_TARGET.COLUMN, ENTITY_TYPE.COLUMN)
        this.name = name
        this.value = value
    }

    toJSON() {
        const json = super.toJSON()
        json.value = this.value
        return json
    }
}

export class AnnotationEntryEntity extends Entity {

    constructor(entry, name) {
        super(entry, ACTION_TARGET.ANNOTATION, ENTITY_TYPE.ANNOTATION)
        this.name = name
    }
}