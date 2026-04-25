import { ref } from "vue"

export function useSelectionStorage() {

    const selections = new Map()
    const time = ref(0)

    function get(id) {
        return selections.get(id)
    }

    function add(selection) {
        if (!selections.has(selection.id)) {
            selections.set(selection.id, selection)
            time.value = Date.now()
        }
    }

    function remove(id) {
        if (selections.has(id)) {
            selections.delete(id)
            time.value = Date.now()
        }
    }

    return {
        time,
        selections,

        get,
        add,
        remove
    }
}