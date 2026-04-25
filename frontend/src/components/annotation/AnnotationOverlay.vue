<template>
    <div>
        <Teleport to="body">
            <canvas ref="annolinks"
                :width="width"
                :height="height"
                class="overlay"
                :style="{
                    left: (offsetX+padding)+'px',
                    top: (offsetY)+'px',
                    pointerEvents: 'none',
                }">
            </canvas>
        </Teleport>

        <Teleport to="body">
            <svg
                :width="width"
                :height="height"
                class="overlay"
                :style="{
                    left: (offsetX+padding)+'px',
                    top: (offsetY)+'px',
                    pointerEvents: 'none'
                }">
                <g v-for="a in annoPolygons" :opacity="active && !selectedAnnos[a.id] ? 0.75 : 1">
                    <g v-for="(p, idx) in a.polygon" :key="a.id+'_'+idx">
                        <circle v-if="p.length === 1"
                            :cx="p[0]"
                            :cy="p[1]"
                            :r="5"
                            :fill="a.color ? a.color : '#333'"
                            stroke="black"
                            stroke-dasharray="4 2"
                            :stroke-width="selectedAnnos[a.id] ? 3 : 2"
                            >
                        </circle>
                        <line v-else-if="props.length === 2"
                            :x1="p[0][0]"
                            :y1="p[0][1]"
                            :x2="p[1][0]"
                            :y2="p[1][1]"
                            :stroke-width="selectedAnnos[a.id] ? 3 : 2"
                            :stroke="a.color ? a.color : 'black'"
                            stroke-dasharray="4 2"
                            fill="none">
                        </line>
                        <path v-else
                            :d="d3.line().curve(d3.curveCardinalClosed)(p)"
                            :stroke-width="selectedAnnos[a.id] ? 3 : 2"
                            :stroke="a.color ? a.color : 'black'"
                            stroke-dasharray="4 2"
                            fill-opacity="0.25"
                            :fill="selectedAnnos[a.id] ? (a.color ? a.color : 'black') : 'none'">
                        </path>
                    </g>
                </g>
            </svg>
        </Teleport>

        <Teleport to="body">
            <div id="anno-panel-overlay" style="z-index: 4999;">
                
                <div v-if="annoLeft.length === 0 && targetRect"
                    :style="{
                        position: 'absolute',
                        width: padding+'px',
                        height: targetRect.height+'px',
                        left: (offsetX+getDummyPosX('left'))+'px',
                        top: offsetY+'px',
                        backgroundColor: '#ededed'
                    }"
                    ></div>

                <AnnotationPanel v-for="aid in annoLeft"
                    :key="aid+'_l_'+annoPos[aid].index"
                    :id="aid"
                    :selected="selectedAnnos[aid]"
                    style-selected
                    hide-input
                    :max-entry-length="100"
                    :width="padding"
                    :min-height="annoMeta.sizeL-2"
                    :max-height="annoMeta.sizeL-2"
                    side="left"
                    @pointerenter="hoverAnno = aid"
                    @pointerleave="hoverAnno = null"
                    draggable="true"
                    @dragstart="onDragAnno(a)"
                    @dragover.prevent="onDragOver"
                    @drop.prevent="onDropAnno(a)"
                    :style="{
                        position: 'absolute',
                        left: (offsetX+getAnnotationPos(aid, true)[0]-25)+'px',
                        top: (offsetY+getAnnotationPos(aid, true)[1])+'px',
                        fontSize: '12px',
                    }"
                    />


                <div v-if="annoRight.length === 0 && targetRect"
                    :style="{
                        position: 'absolute',
                        width: padding+'px',
                        height: targetRect.height+'px',
                        left: (offsetX+getDummyPosX('right'))+'px',
                        top: offsetY+'px',
                        backgroundColor: '#ededed'
                    }"
                    ></div>

                <AnnotationPanel v-for="aid in annoRight"
                    :key="aid+'_r_'+annoPos[aid].index"
                    :id="aid"
                    :selected="selectedAnnos[aid]"
                    style-selected
                    hide-input
                    :max-entry-length="100"
                    :width="padding"
                    :min-height="annoMeta.sizeR-2"
                    :max-height="annoMeta.sizeR-2"
                    side="right"
                    @pointerenter="hoverAnno = aid"
                    @pointerleave="hoverAnno = null"
                    draggable="true"
                    @dragstart="onDragAnno(a)"
                    @dragover.prevent="onDragOver"
                    @drop.prevent="onDropAnno(a)"
                    :style="{
                        position: 'absolute',
                        left: (offsetX+getAnnotationPos(aid, true)[0])+'px',
                        top: (offsetY+getAnnotationPos(aid, true)[1])+'px',
                        fontSize: '12px',
                    }"/>
            </div>
        </Teleport>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import DM from '@/use/data-manager';
    import { useWindowScroll, useWindowSize } from '@vueuse/core';
    import { computed, onMounted, reactive, watch } from 'vue';
    import { euclidean } from '@/use/util';
    import AnnotationPanel from './AnnotationPanel.vue';
    import { useAnno } from '@/stores/anno';
    import { storeToRefs } from 'pinia';

    const props = defineProps({
        targetId: {
            type: String,
            required: true
        },
        active: {
            type: Boolean,
            required: true
        },
        time: {
            type: Number,
            default: 0
        },
        selected: {
            type: String,
            default: ""
        },
        tolerance: {
            type: Number,
            default: 50
        },
        padding: {
            type: Number,
            default: 150
        },
    })

    const emit = defineEmits(["select-color"])

    const annoStore = useAnno()
    const { hoverTime } = storeToRefs(annoStore)

    const scroll = useWindowScroll()

    const annolinks = ref(null)

    const offsetX = ref(0)
    const offsetY = ref(0)
    const width = ref(0)
    const height = ref(0)

    const annoPolygons = ref([])
    const annoLeft = ref([])
    const annoRight = ref([])

    const annoPos = ref({})
    const annoMeta = reactive({
        sizeL: 15,
        sizeR: 15,
    })

    let actx, targetRect = null, dragAnno = null;

    const wSize = useWindowSize()

    const hoverAnno = ref(null)
    const hoverAnnoCol = ref("")
    const selectedAnnos = ref({})

    function onDragAnno(anno) {
        dragAnno = anno
    }

    function onDropAnno(anno) {
        if (dragAnno !== null) {
            // trigger merge
            if (dragAnno.id !== anno.id) {
                DM.mergeAnnotations(anno.id, dragAnno.id)
            }
            dragAnno = null
        }
    }

    function onDragOver(event) {
        event.dataTransfer.dropEffect = "move"
    }

    function getDummyPosX(side) {
        switch(side) {
            case "left": return -5
            default:
            case "right": return props.padding + targetRect.width + 5
        }
    }

    function getAnnotationPos(id, usePadding=false) {
        const pos = annoPos.value[id]
        if (!pos) return [0, 0]
        switch(pos.side) {
            case "left": return [-5, pos.index*annoMeta.sizeL]
            default:
            case "right": return [(usePadding ? props.padding : 0)+targetRect.width+5, pos.index*annoMeta.sizeR]
        }
    }

    function getCoordinates() {
        const target = document.querySelector("#"+props.targetId)
        if (!target) return
        const rect = target.getBoundingClientRect()
        offsetX.value = rect.left - props.padding
        offsetY.value = rect.top + scroll.y.value
        width.value = rect.width
        height.value = rect.height
        targetRect = rect
    }

    function drawLinks() {
        actx = actx ? actx : annolinks.value.getContext("2d")
        actx.clearRect(0, 0, width.value, height.value)

        // if (props.active === false) return

        const path = d3.line()
            .context(actx)
            .x(d => d[0])
            .y(d => d[1])

        actx.globalAlpha = 1
        actx.lineWidth = 2

        const annos = DM.getAnnotations()
        annos.forEach(a => {
            if ((annoStore.isHovered(a.id) || selectedAnnos.value[a.id]) && annoPos.value[a.id]) {
                // draw links that connect annotations labels and polygons
                actx.strokeStyle = a.color ? a.color : "black"
                const coords = getAnnotationPos(a.id)
                const off = 0.5 * (annoPos.value[a.id].side === "left" ? annoMeta.sizeL : annoMeta.sizeR)
                a.centroid.forEach(c => {
                    actx.beginPath()
                    path([c, [coords[0], coords[1]+off]])
                    actx.stroke()
                })
            }
        })

        // const scale = d3.scaleLinear()
        //     .domain([1, Math.max(2, d3.max(graph.links, d => d.value))])
        //     .range([1, 10])

        // actx.strokeStyle = "black"
        // actx.globalAlpha = 0.25
        // // draw links that connect annotations
        // graph.links.forEach(d => {
        //     actx.lineWidth = scale(d.value)
        //     actx.beginPath()
        //     path(d.coords)
        //     actx.stroke()
        // })
    }

    function calcLabelPositions() {
        const data = DM.getAnnotations()

        if (data.length > 0) {
            // default size
            const h = 20
            let pos, annoPosData = {}

            // get annotations on the left side
            const onLeft = data.filter(d => d.x <= targetRect.width*0.5)
            onLeft.sort((a, b) => a.y - b.y)

            let numL = Math.floor(targetRect.height / h)
            let sizeL = Math.floor(targetRect.height / numL)
            if (onLeft.length > 0 && Math.floor(targetRect.height / onLeft.length) > sizeL) {
                numL = onLeft.length
                sizeL = Math.floor(targetRect.height / numL)
            }

            const takenL = new Set()
            onLeft.forEach(a => {
                let minD = Number.MAX_VALUE
                // then check left and right
                for (let i = 0; i < numL; ++i) {
                    // distance to position
                    if (!takenL.has(i)) {
                        const dist = euclidean(a.x, a.y, 0, (i+0.5)*sizeL)
                        if (dist < minD) {
                            minD = dist
                            pos = i;
                        }
                    }
                }
                takenL.add(pos)
                annoPosData[a.id] = { index: pos, side: "left" }
            })

            // get annotations on the right side
            const onRight = data.filter(d => d.x > targetRect.width*0.5)
            onRight.sort((a, b) => a.y - b.y)

            let numR = Math.floor(targetRect.height / h)
            let sizeR = Math.floor(targetRect.height / numR)
            if (onRight.length > 0 && Math.floor(targetRect.height / onRight.length) > sizeR) {
                numR = onRight.length
                sizeR = Math.floor(targetRect.height / numR)
            }

            const takenR = new Set()
            onRight.forEach(a => {
                let minD = Number.MAX_VALUE
                // then check left and right
                for (let i = 0; i < numR; ++i) {
                    // distance to position
                    if (!takenR.has(i)) {
                        const dist = euclidean(a.x, a.y, targetRect.width, (i+0.5)*sizeR)
                        if (dist < minD) {
                            minD = dist
                            pos = i;
                        }
                    }
                }
                takenR.add(pos)
                annoPosData[a.id] = { index: pos, side: "right" }
            })

            annoPolygons.value = data
                .map(d => ({ id: d.id, polygon: d.polygon, color: d.color }))
                .filter(d => d.polygon)
                
            annoMeta.sizeL = sizeL
            annoMeta.sizeR = sizeR
            annoPos.value = annoPosData
            annoLeft.value = onLeft.map(d => d.id)
            annoRight.value = onRight.map(d => d.id)
        } else {
            annoPos.value = {}
            annoPolygons.value = []
            annoLeft.value = []
            annoRight.value = []
        }
    }

    function readSelected() {
        const obj = {}
        const ids = new Set(DM.getMatchingAnnotations().map(d => d.id))
        DM.getAnnotations().forEach(d => obj[d.id] = ids.has(d.id))
        selectedAnnos.value = obj
    }

    function update() {
        getCoordinates()
        drawLinks()
    }

    function init() {
        getCoordinates()
        calcLabelPositions()
        readSelected()
        // const { nodes, links } = DM.getAnnotationConnections()
        // graph.nodes = nodes
        // graph.links = links
        // graph.links.forEach(d => {
        //     const s = graph.nodes.find(n => n.id === d.source)
        //     const t = graph.nodes.find(n => n.id === d.target)
        //     d.coords = [[s.x, s.y], [t.x, t.y]]
        // })
        drawLinks()
    }

    onMounted(init)

    watch(() => ([props.targetId, props.time]), init, { deep: true })
    watch(wSize.width, getCoordinates)
    watch(wSize.height, getCoordinates)
    watch(scroll.y, update)
    
    watch(() => props.active, function() {
        readSelected()
        drawLinks()
    })

    watch(hoverTime, drawLinks)


</script>

<style scoped>
.overlay {
    position: absolute;
    z-index: 100;
}
.anno-container:not(:hover) .del-anno,
.anno-container:not(:hover) .add-anno {
    visibility: hidden;
}
</style>