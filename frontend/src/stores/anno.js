import { defineStore } from 'pinia'

export const useAnno = defineStore('anno', {
    state: () => ({
        hovered: new Set(),
        hoverTime: 0,
    }),

    getters: {
        hasHoveredAnno: state => state.hovered.size > 0
    },

    actions: {

        isHovered(id) {
            return this.hovered.has(id)
        },

        addHoverAnno(id) {
            if (!this.isHovered(id)) {
                this.hovered.add(id)
                this.hoverTime = Date.now()
            }
        },

        removeHoverAnno(id) {
            if (this.isHovered(id)) {
                this.hovered.delete(id)
                this.hoverTime = Date.now()
            }
        },

        toggleHoverAnno(id) {
            if (this.isHovered(id)) {
                this.addHoverAnno(id)
            } else {
                this.removeHoverAnno(id)
            }
        },
    }
})
