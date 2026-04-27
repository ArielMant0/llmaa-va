import { useData } from "@/stores/data"
import { updateData } from "./apis/data-api"

export function useSelections() {

    const selectionTime = ref(0)
    const selections = ref([])

    function has(id) {
        return get(id) !== undefined
    }

    function get(id) {
        return selections.value.find(d => d.id === id)
    }

    function add(selection, refresh=false) {
        selections.value.push(selection)
        if (refresh) update()
    }

    function remove(id, refresh=false) {
        const idx = selections.findIndex(d => d.id === id)
        if (idx >= 0) {
            selections.value.splice(idx, 1)
            if (refresh) update()
        }
    }

    function update() {
        selectionTime.value = Date.now()
    }

    async function sync(sel) {
        const dstore = useData()
        if (sel) {
            try {
                const json = sel.toJSON()
                json.dataset_id = dstore.datasetId
                const res = await updateData("group", json)
                if (res.id) sel.id = res.id
            } catch(e) {
                console.error(e.toString())
            }
        } else {
            return Promise.all(selections.value.map(async (s) => {
                try {
                    const json = s.toJSON()
                    json.dataset_id = dstore.datasetId
                    const res = await updateData("group", json)
                    if (res.id) s.id = res.id
                } catch(e) {
                    console.error(e.toString())
                }
            }))
        }
    }

    return {
        selectionTime,
        selections,

        add,
        remove,
        get,
        has,
        sync,
        update
    }
}