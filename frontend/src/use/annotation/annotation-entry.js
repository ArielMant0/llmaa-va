import DM from "../data-manager";
import { compareEntityType, Entity } from "./entity";
import { Modifier } from "./modifiers";

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

    constructor(annotation, type, src, entities=[], id=null) {
        this._anno = annotation
        this.id = id
        this.type = type
        this.source = src
        this.entities = []
        this.addEntities(entities, false)
        this.timeUpdated = Date.now()
    }

    static fromJSON(json) {
        const anno = DM.getAnnotationById(json.annotation_id)
        switch(json.type) {
            default:
                return new TextEntry(
                    anno,
                    json.text,
                    json.source,
                    json.entities.map(e => Entity.fromJSON(e)),
                    json.id
                )
            case ENTRY_TYPE.MODIFIER:
                const modEntry = new ModifierEntry(
                    anno,
                    json.text,
                    json.source,
                    json.entities.map(e => Entity.fromJSON(e)),
                    null,
                    json.id
                )
                modEntry.setModifier(Modifier.fromJSON(modEntry, json.modifier))
                return modEntry
        }
    }

    toJSON() {
        return {
            id: this.id,
            annotation_id: this._anno.id,
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

    constructor(annotation, text, src, entities=[], id=null) {
        super(annotation, ENTRY_TYPE.TEXT, src, entities, id)
        this.text = text
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

    constructor(annotation, text, src, entities=[], modifier=null, id=null) {
        super(annotation, ENTRY_TYPE.MODIFIER, src, entities, id)
        this.text = text
        this.modifier = modifier
    }

    toJSON() {
        const json = super.toJSON()
        json.text = this.text
        json.modifier = this.modifier.toJSON()
        return json
    }

    setModifier(modifier) {
        this.modifier = modifier
    }

    getModifier() {
        return this.modifier
    }
}