import { defineStore } from 'pinia'

export const DATA_TYPES = Object.freeze({
    SEQUENTIAL: 1,
    ORDINAL: 2,
    NOMINAL: 3,
    INTEGER: 4,
    QUANTILE: 5,
    BOOLEAN: 6,
    // SET: 7
})

export const DATASETS = [
    {
        name: "dota2",
        x: "x",
        y: "y",
        color: "pub_win",
        type: DATA_TYPES.SEQUENTIAL,
        ignore: ["name"],
        meta: ["name"]
    },{
        name: "cereals",
        x: "x",
        y: "y",
        color: "rating",
        type: DATA_TYPES.SEQUENTIAL,
        ignore: ["name"],
        meta: ["name"],
        types: {
            // "calories": DATA_TYPES.INTEGER,
            // "protein": DATA_TYPES.INTEGER,
            // "fat": DATA_TYPES.INTEGER,
            // "sodium": DATA_TYPES.INTEGER,
            // "sugars": DATA_TYPES.INTEGER,
            // "potassium": DATA_TYPES.INTEGER,
            // "vitamins & minerals": DATA_TYPES.INTEGER,
            "display_shelf": DATA_TYPES.ORDINAL,
        }
    }
]

export function convertDType(dtype) {
    switch(dtype.toLowerCase()) {
        default:
        case "float":
        case "double":
        case "number":
            return DATA_TYPES.SEQUENTIAL
        case "integer":
            return DATA_TYPES.INTEGER
        case "string":
        case "text":
            return DATA_TYPES.NOMINAL
        case "bool":
        case "boolean":
            return DATA_TYPES.BOOLEAN
    }
}

export const useData = defineStore('data', {
    state: () => ({
        loaded: false,

        datasets: [],
        dataset: null,
        datasetId: null,

        loadTime: {},
        reloadTime: {},
    }),

    getters: {
        hasDatasets: state => state.datasets.length > 0,
        datasetColor: state => {
            if (state.dataset) {
                return state.dataset.colorAttr ?
                    state.dataset.colorAttr :
                    state.dataset.color
            }
            return null
        },
        datasetX: state => state.dataset ? state.dataset.x : null,
        datasetY: state => state.dataset ? state.dataset.y : null,
    },

    actions: {

        setLoaded(value) {
            this.loaded = value === true
        },

        setDatasets(datasets) {
            this.datasets = datasets
            if (!this.dataset && datasets.length > 0) {
                this.setDataset(datasets.at(0).id)
            }
        },

        setDataset(id) {
            const ds = this.datasets.find(d => d.id === id)
            if (ds) {
                const meta = DATASETS.find(d => d.name === ds.name)
                this.dataset = meta
                this.datasetId = id
            }
        },

        setColor(name) {
            if (this.dataset) {
                this.dataset.color = name
            }
        },

        setReloadTime(name) {
            this.reloadTime[name] = Date.now()
        },

        setLoadTime(name) {
            this.loadTime[name] = Date.now()
        }
    }
})
