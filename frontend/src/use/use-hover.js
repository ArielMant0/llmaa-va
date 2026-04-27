import { computed, reactive } from "vue"

export function useHover() {

    const hoverTime = ref(0)
    const hovered = reactive(new Map())
    const showOverlay = ref(false)

    const hasHoveredEntity = computed(() => hovered.size > 0)

    function isHovered(entityId) {
        return hovered.has(entityId)
    }

    function set(entityId, data) {
        if (!isHovered(entityId)) {
            hovered.set(entityId, data)
            hoverTime.value = Date.now()
        }
    }

    function unset(entityId) {
        if (isHovered(entityId)) {
            hovered.delete(entityId)
            hoverTime.value = Date.now()
        }
    }

    function toggle(entityId, data) {
        if (isHovered(entityId)) {
            set(entityId, data)
        } else {
            unset(entityId)
        }
    }

    
    return {
        hoverTime,
        hovered,
        showOverlay,

        hasHoveredEntity,

        isHovered,
        set,
        unset,
        toggle
    }
}