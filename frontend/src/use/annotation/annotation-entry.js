import { compareEntityType, Entity } from "./entity";

let _ENTRY_ID = 1;

export const ENTRY_SOURCE = Object.freeze({
    USER: 1,
    AI: 2,
    COMBINED: 3
});

export const ENTRY_TYPE = Object.freeze({
    TEXT: 1,
    MODIFIER: 2,
    VIS: 3,
});

export class AnnotationEntry {

    constructor(annotation, type, src, entities=[]) {
        this._anno = annotation
        this.id = `${_ENTRY_ID++}_entry`
        this.type = type
        this.source = src
        this.entities = []
        this.addEntities(entities, false)
        this.timeUpdated = Date.now()
    }

    static fromJSON(json) {
        // TODO: save which kind of entry we had
        return new TextEntry(
            json.annotation_id,
            json.text,
            ENTRY_SOURCE.AI, // TODO
            json.entities.map(e => Entity.fromJSON(e))
        )
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            source: this.source,
            time_updated: this.timeUpdated,
            entities: this.entities.map(e => e.toJSON())
        }
    }

    update() {
        this.timeUpdated = Date.now()
        this._anno.update()
    }

    hasEntity(type, id) {
        return this.entities.some(d => d.type === type && d.id === id)
    }
    
    addEntities(entities, update=true) {
        const before = this.entities.length
        const tmp = this.entities.concat(entities)
        const entitySet = {}
        this.entities = tmp.filter(d => {
            // create empty set for this type of entity
            if (!entitySet[d.type]) {
                entitySet[d.type] = new Set()
            }
            // entity already exists
            if (entitySet[d.type].has(d.id)) {
                return false
            }
            // add this entity to the list
            entitySet[d.type].add(d.id)
            return true
        })
        this.entities.sort((a, b) => compareEntityType(a.type, b.type))

        if (update && this.entities.length !== before) {
            this.update()
        }
    }

    removeEntity(id) {
        const index = this.entities.findIndex(d => d.id === id)
        if (index >= 0) {
            this.entities.splice(index, 1)
            this.update()
        }
    }
}

export class TextEntry extends AnnotationEntry {

    constructor(annotation, text, src, entities=[]) {
        super(annotation, ENTRY_TYPE.TEXT, src)
        this.text = text
        this.addEntities(entities, false)
        this.timeUpdated = Date.now()
    }

    toJSON() {
        const json = super.toJSON()
        json.text = this.text
        return json
    }

    getText() {
        return this.text
    }

    addText(text) {
        this.setText(this.text + "\n\n" + text)
    }

    setText(text) {
        this.text = text
        this.update()
    }

}

export class ModifierEntry extends AnnotationEntry {

    constructor(annotation, text, src, entities=[], modifier=null) {
        super(annotation, ENTRY_TYPE.MODIFIER, src)
        this.text = text
        this.modifier = modifier
        this.addEntities(entities, false)
        this.timeUpdated = Date.now()
    }

    toJSON() {
        const json = super.toJSON()
        json.text = this.text
        json.modifier = this.modifier
        return json
    }

    setModifier(modifier) {
        this.modifier = modifier
    }

    getModifier() {
        return this.modifier
    }
}