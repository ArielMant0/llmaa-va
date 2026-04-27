import { useApp } from "@/stores/app"
import Annotation from "./annotation/annotation"
import { ModifierEntry, TextEntry } from "./annotation/annotation-entry"
import { ColorFunctionModifier } from "./annotation/modifiers"
import { useDatabase } from "./use-database"
import { useSelections } from "./use-selections"

const DEFAULT_ANNO_OPTIONS = Object.freeze({
    id: null, // annotation id
    selections: [], // list of selections
    useGlobal: false, // use active selections
})

export function useAnnotations() {

    // Members
    const annoTime = ref(0)
    const annotations = ref([])

    const globalAnno = new Annotation([], [], "Notes", "G")

    // Functions
    function update() {
        annoTime.value = Date.now()
    }

    function has(id) {
        return get(id) !== undefined
    }

    function get(id) {
        return annotations.value.find(d => d.id === id)
    }

    function getGlobal() {
        return globalAnno
    }

    function set(annos, refresh=true) {
        annotations.value = annos.map(d => Annotation.fromJSON(d))
        if (refresh) update()
    }

    async function add(anno, refresh=true) {
        annotations.value.push(anno)
        await sync(anno.id)
        if (refresh) update()
    }

    function remove(id, refresh=true) {
        const idx = annotations.findIndex(d => d.id === id)
        if (idx >= 0) {
            annotations.value.splice(idx, 1)
            if (refresh) update()
        }
    }

    function createEmpty(label="A1", selections=null) {
        const useSel = useSelections()

        let ids = new Set()
        let activeSels;

        if (selections !== null) {
            const useDB = useDatabase()
            selections.forEach(s => {
                ids = ids.union(s.data)
                s.calculatePolygon(
                    useDB.data,
                    useDB.xAttr.value,
                    useDB.yAttr.value,
                    useDB.scales.x,
                    useDB.scales.y
                )
            })
            activeSels = selections
        } else {
            useSel.selections.value.map(s => s.copy())
        }

        return new Annotation(
            ids,
            activeSels,
            "Annotation",
            label
        )
    }

    function createFromOptions(options=DEFAULT_ANNO_OPTIONS) {
        const opts = Object.assign(Object.assign({}, DEFAULT_ANNO_OPTIONS), options)

        if (opts.id !== null && opts.id !== undefined) {
            // use a specific existing annotation
            return get(opts.id)
        } else if (opts.useGlobal) {
            // use the global annotation
            return getGlobal()
        } else if (opts.selections && opts.selections.length > 0) {
            // use the given selections for a new annotation
            return this.createEmptyAnnotation(
                `A${annotations.value.length+1}`,
                opts.selections
            )
        } else {
            // use the active selections for a new annotation
            return this.createEmptyAnnotation(
                `A${annotations.value.length+1}`
            )
        }
    }

    function annotateEmpty(selections=null) {
        return add(createEmpty(
            `A${this.annotations.length+1}`,
            selections
        ))
    }

    function annotateText(text, src, entities=[], options=DEFAULT_ANNO_OPTIONS) {
        const target = createFromOptions(options)
        if (target) {
            const entry = new TextEntry(target, text, src, entities)
            if (target.id === globalAnno.id) {
                target.addEntry(entry)
            } else {
                target.addEntry(entry, false)
                add(target)
            }
            // return the created entry
            return entry
        }
        return null
    }

    function annotateModifier(text, src, entities, options=DEFAULT_ANNO_OPTIONS) {
        const target = createFromOptions(options)
        if (target) {
            const entry = new ModifierEntry(target, text, src, entities)
            const modifier = new ColorFunctionModifier(entry, entities)
            entry.setModifier(modifier)
            if (target.id === globalAnno.id) {
                target.addEntry(entry)
            } else {
                target.addEntry(entry, false)
                add(target)
            }
            // return the created entry
            return entry
        }
        return null
    }

    function getMatching(selectionId=null, limit=0) {
        const useSel = useSelections()
        const ids = selectionId ?
            useSel.get(selectionId).data :
            useSel.selections.value.at(0)[data]

        if (limit === 1) {
            const match = annotations.value.find(d => d.hasDataOverlap(ids))
            return match ? match : []
        } else if (limit > 1) {
            const matches = []
            // add other annotations until the limit is reached
            for (let i = 0; i < annotations.value.length && matches.length <= limit; ++i) {
                const d = annotations.value[i]
                if (d.hasDataOverlap(ids)) {
                    matches.push(d)
                }
            }
            return matches
        } else {
            return annotations.value.filter(d => d.hasDataOverlap(ids))
        }
    }

    function getEntry(id) {
        const ge = globalAnno.getEntry(id)
        if (ge) return ge
        for (let i = 0; i < annotations.value.length; ++i) {
            const ae = annotations.value[i].getEntry(id)
            if (ae) return ae
        }
        return null
    }

    function removeEntry(id) {
        if (globalAnno.hasEntry(id)) {
            globalAnno.removeEntry(id)
            return true
        } else {
            const anno = annotations.value.find(d => d.hasEntry(id))
            if (anno) {
                anno.removeEntry(id)
                return true
            }
        }
        return false
    }

    /**
     * Actions to execute (globally) when an entry is added
     * @param {Entry} entry
     */
    function onAddEntry(entry) {
        if (entry.type === ENTRY_TYPE.MODIFIER) {
            const useDB = useDatabase()
            const modifier = entry.getModifier()
            modifier.applyAll(useDB.data)

            const app = useApp()
            app.setColorOverride(modifier.type)
            app.scales[MODIFIER_TYPE.COLOR_FUNCTION] = modifier.colormap

            // TODO: update feature column
            // this.columnUpdate(modifier.type, 10, function() {
            //     const now = Date.now()
            //     app.featureTime = now
            //     app.lensTime = now
            // })
        }
    }

    /**
     * Actions to execute (globally) when an entry is removed
     * @param {Entry} entry
     */
    function onRemoveEntry(entry) {
        if (entry.type === ENTRY_TYPE.MODIFIER) {
            const useDB = useDatabase()
            const modifier = entry.getModifier()
            modifier.resetAll(useDB.data)

            const app = useApp()
            app.setColorOverride("")

            // TODO: update feature column
            // this.columnUpdate(modifier.type, 10, function() {
            //     const now = Date.now()
            //     app.featureTime = now
            //     app.lensTime = now
            // })
        }
    }

    async function sync(anno=null) {
        const dstore = useData()
        if (anno) {
            try {
                const json = anno.toJSON()
                json.dataset_id = dstore.datasetId
                json.group_id = anno.id
                const res = await updateData("annotation", json)
                if (res.id) anno.id = res.id
            } catch(e) {
                console.error(e.toString())
            }
        } else {
            return Promise.all(annotations.value.map(async (a) => {
                try {
                    const json = a.toJSON()
                    json.dataset_id = dstore.datasetId
                    json.group_id = a.id
                    const res = await updateData("annotation", json)
                    if (res.id) a.id = res.id
                } catch(e) {
                    console.error(e.toString())
                }
            }))
        }
    }

    return {
        // reactive
        annoTime,
        annotations,

        // not reactive
        globalAnno,

        // functions
        add,
        remove,
        set,
        get,
        has,
        getMatching,


        createEmpty,
        createFromOptions,
        annotateEmpty,
        annotateText,
        annotateModifier,

        onAddEntry,
        onRemoveEntry,
        getEntry,
        removeEntry,

        sync,
        update
    }
}