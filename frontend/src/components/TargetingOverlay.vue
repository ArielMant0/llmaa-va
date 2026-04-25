<template>
    <Teleport to="body">
        <div v-show="showTargetOverlay" id="targeting-overlay">
            <svg id="to-svg" width="100%" height="100%"></svg>
        </div>
    </Teleport>
</template>

<script setup>
    import * as d3 from 'd3'
    import DM from '@/use/data-manager';
    import { useControls } from '@/stores/controls';
    import { ACTION_TARGET } from '@/use/annotation/action-target';
    import { storeToRefs } from 'pinia';
    import { onBeforeUnmount, onMounted, watch } from 'vue';
    import { LLMCommand } from '@/use/commands';
    import { AnnotationEntity, ColumnEntity, SelectionEntity } from '@/use/annotation/entity';
    import { useApp } from '@/stores/app';

    const app = useApp()
    const { showTargetOverlay } = storeToRefs(app)
    
    const controls = useControls()
    const { canTarget, activeMappingId } = storeToRefs(controls)
    
    const props = defineProps({
        color: { type: String, default: "magenta" },
        offset: { type: Number, default: 5 },
    })

    const scrollContainers = new Set();

    let svgNodes = [], highlights = []
    let scrollPending = false

    function getScrollableAncestors(el) {
        const ancestors = []

        let current = el.parentElement

        while (current && current !== document.body) {
            const style = window.getComputedStyle(current)
            const overflowY = style.overflowY
            const overflowX = style.overflowX

            if (
                overflowY === "auto" || overflowY === "scroll" ||
                overflowX === "auto" || overflowX === "scroll"
            ) {
                ancestors.push(current);
            }

            current = current.parentElement
        }

        return ancestors
    }

    function show() {
        if (showTargetOverlay.value || !canTarget.value) return
        console.debug("showing targeting overlay")
        reset()
        showTargetOverlay.value = true

        makeHighlights()
    }

    function hide() {
        if (!showTargetOverlay.value) return
        controls.cancelActive()
        showTargetOverlay.value = false
        reset()
    }

    function reset() {
        // remove target class
        highlights.forEach(d => d.el.classList.remove("valid-target"))
        highlights = []
        // remove scroll listeners
        scrollContainers.forEach(d => {
            d.removeEventListener("scroll", updateHighlights, { passive: true })
        })
        scrollContainers.clear()
    }

    function onClick(element) {
        // get target type
        const targetType = element.getAttribute('data-target-type')
        const ids = element.getAttribute('data-target-id').split(",")
        const targetId = ids.length > 1 ? ids : ids[0]

        if (!targetType || !targetId) return

        switch (targetType) {
            case ACTION_TARGET.SELECTION:
                {
                    const annoId = element.getAttribute('data-target-anno')
                    // this is actually a selection in an annotation
                    if (annoId) {
                        const anno = DM.getAnnotationById(annoId)
                        controls.targetEvent(
                            anno.selections.map(s => new SelectionEntity(s.id, anno.label, s)),
                            targetType,
                            anno
                        )
                    } else {
                        controls.targetEvent(
                            ids.map(tid => {
                                const s = DM.getSelectionById(tid)
                                return new SelectionEntity(tid, tid, s)
                            }),
                            targetType
                        )
                    }
                }
                break
            case ACTION_TARGET.ANNOTATION:
                {
                    const annoId = element.getAttribute('data-target-anno')
                    const anno = DM.getAnnotationById(annoId)
                    controls.targetEvent(
                        new AnnotationEntity(targetId, anno.label, anno),
                        targetType,
                        anno
                    )
                }
                break
            case ACTION_TARGET.VIS:
                // TODO: what should happen here?
                controls.targetEvent(element, targetType)
                break
            case ACTION_TARGET.COLUMN:
                const colId = DM.columnsRaw.find(d => d.name === targetId).id
                controls.targetEvent(
                    new ColumnEntity(colId, targetId, targetId),
                    targetType
                )
                break
        }
    }

    function makeHighlights() {
        if (!showTargetOverlay.value) return;

        const cmd = controls.activeMapping.command
        if (!(cmd instanceof LLMCommand)) return

        // get selectors of available targets for the currently active mapping
        const selectors = cmd.targetTypes.map(d => `*[data-target-type="${d}"]`)
        const elements = Array.from(document.querySelectorAll(selectors))
        highlights = elements.map(d => ({ el: d, rect: d.getBoundingClientRect() }))

        const svg = d3.select("#to-svg")

        svg.selectAll(".indicator").remove()

        svgNodes = svg.selectAll(".indicator")
            .data(highlights)
            .join("rect")
            .classed("indicator valid-target rot-border", true)
            .style("pointer-events", "all")
            .attr("fill", "black")
            .attr("fill-opacity", 0.1)
            .attr("stroke", "black")
            .attr("stroke-dasharray", "4 4")
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("x", d => d.rect.left-props.offset)
            .attr("y", d => d.rect.top-props.offset)
            .attr("width", d => d.rect.width+2*props.offset)
            .attr("height", d => d.rect.height+2*props.offset)
            .on("pointerenter", function() {
                d3.select(this).attr("stroke", props.color)
            })
            .on("pointerleave", function() {
                d3.select(this).attr("stroke", "black")
            })
            .on("click", function(_e, d) { onClick(d.el) })

        // attach scroll listeners for ancestors
        highlights.forEach(({ el }) => {
            getScrollableAncestors(el).forEach(container => {
                scrollContainers.add(container)
            })
        })

        scrollContainers.forEach(container => {
            container.addEventListener("scroll", updateHighlights, { passive: true });
        })

        updateHighlights()
    }

    function updateHighlights() {
        if (!showTargetOverlay.value || scrollPending) return

        scrollPending = true;
        requestAnimationFrame(() => {
            scrollPending = false
            highlights.forEach(d => d.rect = d.el.getBoundingClientRect())
            svgNodes
                .attr("x", d => d.rect.left-props.offset)
                .attr("y", d => d.rect.top-props.offset)
                .attr("width", d => d.rect.width+2*props.offset)
                .attr("height", d => d.rect.height+2*props.offset)
                .style("display", d => {
                    const parents = getScrollableAncestors(d.el)
                    if (parents.length === 0) {
                        return "block"
                    }
                    const rect = parents[0].getBoundingClientRect()
                    return d.rect.top > rect.bottom || d.rect.bottom < rect.top ||
                        d.rect.left > rect.right || d.rect.right < rect.left ?
                        "none" : "block"
                })
        })
    }

    function init() {
        window.addEventListener("resize", makeHighlights)
        window.addEventListener("scroll", updateHighlights, { passive: true });
    }

    onMounted(init)
    onBeforeUnmount(function() {
        reset()
        window.removeEventListener("resize", makeHighlights)
        window.removeEventListener("scroll", updateHighlights, { passive: true })
    })

    watch(activeMappingId, function(value) {
        if (value !== null) {
            show()
        }
    })
    watch(canTarget, function(value) {
        if (value) {
            show()
        } else {
            hide()
        }
    })

</script>

<style>
#targeting-overlay {
    position: fixed;
    inset: 0;
    z-index: 4999;
    pointer-events: none;
}
</style>