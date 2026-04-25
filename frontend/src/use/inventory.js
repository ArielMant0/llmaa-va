import { useApp } from "@/stores/app";

let _ID = 1;

class Inventory {
    constructor() {
        this.data = [];
    }

    reset() {
        _ID = 1;
        clear()
    }

    clear() {
        this.data = []
    }

    update() {
        const app = useApp()
        app.inventoryTime = Date.now()
    }

    add(dataset, annotations, links) {
        if (annotations.length === 0) return

        const counts = new Map()

        let idSet = new Set()
        annotations.forEach(a => {
            a.columns.forEach(c => counts.set(c.name, (counts.get(c.name) || 0) + 1))
            idSet = idSet.union(new Set(a.ids))
        })

        const tmp = Array.from(counts.entries())
        tmp.sort((a, b) => b[1] - a[1])

        this.data.push({
            id: _ID++,
            dataset: dataset,
            annotations: annotations,
            links: links,
            stats: {
                size: annotations.length,
                data: idSet.size,
                columns: tmp.slice(0, 5).map(d => d[0])
            }
        })
        this.update()
    }

    remove(id) {
        const idx = this.data.find(d => d.id === id)
        if (idx >= 0) {
            this.data.splice(idx, 1)
            this.update()
        }
    }

    getData(dataset=null) {
        return dataset !== null ?
            this.data.filter(d => d.dataset === dataset) :
            this.data
    }
}

const INV = new Inventory()

export { INV as default }
