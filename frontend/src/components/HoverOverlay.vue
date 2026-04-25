<template>
    <Teleport to="body">
        <div v-show="showHoverOverlay" id="hover-overlay">
            <svg id="ho-svg" width="100%" height="100%"></svg>
        </div>
    </Teleport>
</template>

<script setup>
    import * as d3 from 'd3'
    import { storeToRefs } from 'pinia';
    import { onBeforeUnmount, onMounted, watch } from 'vue';
    import { useApp } from '@/stores/app';

    const app = useApp()
    const { hasHoveredEntity, showHoverOverlay, showTargetOverlay } = storeToRefs(app)

    const props = defineProps({
        color: { type: String, default: "red" },
        offset: { type: Number, default: 5 },
    })

    const scrollContainers = new Set();

    let svgNodes = null, highlights = []
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
        if (showHoverOverlay.value || showTargetOverlay.value) return
        console.debug("showing hover overlay")
        reset()
        showHoverOverlay.value = true
        makeHighlights()
    }

    function hide() {
        if (!showHoverOverlay.value) return
        showHoverOverlay.value = false
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

    function makeHighlights() {
        if (!showHoverOverlay.value) return;

        // get selectors of hovered entities
        const ids = Array.from(app.hovered.keys())
        const idSel = ids.map(d => `*[data-target-id="${d}"]`)
        const data = Array.from(app.hovered.values())
        const dataeSel = data.map(d => `*[data-target-type="${d.type}"][data-target-id="${d.data}"]`)
        const elements = Array.from(document.querySelectorAll(idSel.concat(dataeSel)))
        highlights = elements.map(d => ({ el: d, rect: d.getBoundingClientRect() }))

        const svg = d3.select("#ho-svg")

        svg.selectAll(".indicator").remove()

        svgNodes = svg.selectAll(".indicator")
            .data(highlights)
            .join("rect")
            .classed("indicator rot-border", true)
            .attr("fill", props.color)
            .attr("fill-opacity", 0.1)
            .attr("stroke", props.color)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("x", d => d.rect.left-props.offset)
            .attr("y", d => d.rect.top-props.offset)
            .attr("width", d => d.rect.width+2*props.offset)
            .attr("height", d => d.rect.height+2*props.offset)

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
        if (showHoverOverlay.value || showTargetOverlay.value || scrollPending) return
        if (!svgNodes) return

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
        window.addEventListener("scroll", updateHighlights, { passive: true })
    }

    onMounted(init)
    onBeforeUnmount(function() {
        reset()
        window.removeEventListener("resize", makeHighlights)
        window.removeEventListener("scroll", updateHighlights, { passive: true })
    })


    watch(hasHoveredEntity, function(value) {
        if (value) {
            show()
        } else {
            hide()
        }
    })
    watch(showTargetOverlay, function(value) {
        if (showHoverOverlay.value && value) {
            hide()
        }
    })

</script>

<style>
#hover-overlay {
    position: fixed;
    inset: 0;
    z-index: 4999;
    pointer-events: none;
}
</style>