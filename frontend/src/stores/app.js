// Utilities
import { LENS_TYPE } from '@/use/Lens'
import { defineStore } from 'pinia'

export const useApp = defineStore('app', {
    state: () => ({
        ready: false,
        useChat: false,

        refMode: "global",
        lensType: LENS_TYPE.RARE,

        numSelections: 0,

        activeLens: 0,
        colorOverride: "",
        colorIndex: 0,
        colorIndexSec: 0,
        scales: {},

        moveLens: false,
        hoverX: 0,
        hoverY: 0,

        dataTime: 0,
        lensTime: 0,
        lensMoveTime: 0,
        annoTime: 0,
        featureTime: 0,
        selectionTime: 0,
        hoverTime: 0,
        chatTime: 0,

        showHotbar: true,
        showInventory: false,
        inventoryTime: 0,

        llmLoading: false,
        initialized: false,

        hovered: new Map(),
        showTargetOverlay: false,
        showHoverOverlay: false,
    }),

    getters: {
        columnIndex: state => state.activeLens === 0 ? state.colorIndex : state.colorIndexSec,
        hasHoveredEntity: state => state.hovered.size > 0
    },

    actions: {

        setInitialized() {
            this.initialized = true
        },

        setChat(value) {
            this.useChat = value === true
        },

        setColor(name) {
            if (this.datasetObj) {
                this.datasetObj.color = name
            }
        },

        setColorIndex(lensIndex, columnIndex) {
            if (lensIndex === 0) {
                this.colorIndex = columnIndex
            } else {
                this.colorIndexSec = columnIndex
            }
        },

        setColorOverride(name="") {
            if (this.colorOverride !== name) {
                this.colorOverride = name
            }
        },

        updateData() {
            this.dataTime = Date.now()
        },

        updateAnno() {
            this.annoTime = Date.now()
        },

        updateLensData() {
            this.lensTime = Date.now()
            this.selectionTime = this.lensTime
        },

        updateChat() {
            this.chatTime = Date.now()
        },

        setLLMLoading(value) {
            this.llmLoading = value === true
        },

        isHoveredEntity(entityId) {
            return this.hovered.has(entityId)
        },

        setHoverEntity(entityId, data) {
            if (!this.isHoveredEntity(entityId)) {
                this.hovered.set(entityId, data)
                this.hoverTime = Date.now()
            }
        },

        unsetHoverEntity(entityId) {
            if (this.isHoveredEntity(entityId)) {
                this.hovered.delete(entityId)
                this.hoverTime = Date.now()
            }
        },

        toggleHoverEntity(entityId, data) {
            if (this.isHoveredEntity(entityId)) {
                this.setHoverEntity(entityId, data)
            } else {
                this.unsetHoverEntity(entityId)
            }
        }
    }
})
