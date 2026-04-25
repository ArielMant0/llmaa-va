import { ACTION_TARGET } from "./action-target"

let _EID = 1

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

    constructor(type, targetType, dataId, data) {
        this.id = `${_EID++}_${type}_ent`
        this.type = type
        this.targetType = targetType
        this.dataId = dataId
        this.data = data
    }

    static fromJSON(json) {
        switch (json.type) {
            case ENTITY_TYPE.SELECTION:
                return new SelectionEntity(json.id, json.data, json.name)
            case ENTITY_TYPE.COLUMN:
                return new ColumnEntity(json.id, json.data, json.name, json.value)
            case ENTITY_TYPE.ANNOTATION:
                return new AnnotationEntity(json.id, json.data, json.name)
            case ENTITY_TYPE.DATAPOINT:
                return new DatapointEntity(json.id, json.data, json.values)
        }
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            data_id: this.dataId
        }
    }
}


export class SelectionEntity extends Entity {

    constructor(id, data, name=data, selection=null) {
        super(ENTITY_TYPE.SELECTION, ACTION_TARGET.SELECTION, id, data)
        this.name = name
        this.selection = selection
    }
}

export class DatapointEntity extends Entity {

    constructor(id, data, values=null) {
        super(ENTITY_TYPE.DATAPOINT, ACTION_TARGET.DATAPOINT, id, data)
        this.name = `data point ${id}`
        this.values = values
    }
}

export class ColumnEntity extends Entity {

    constructor(id, data, name=data, value=null) {
        super(ENTITY_TYPE.COLUMN, ACTION_TARGET.COLUMN, id, data)
        this.name = name
        this.value = value
    }
}

export class AnnotationEntity extends Entity {

    constructor(id, data, name=data, annotation=null) {
        super(ENTITY_TYPE.ANNOTATION, ACTION_TARGET.ANNOTATION, id, data)
        this.name = name
        this.annotation = annotation
    }
}