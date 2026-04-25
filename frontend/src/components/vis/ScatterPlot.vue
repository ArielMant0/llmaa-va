<template>
    <div style="position: relative; border: 1px solid grey;">
        <canvas ref="el" class="scatter" :width="width" :height="height" @pointermove="onMove" @click="onClick" @pointerleave="onMove"></canvas>
        <svg ref="overlay" class="overlay" :width="width" :height="height"></svg>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import { useApp } from '@/stores/app'
    import { DATA_TYPES } from '@/stores/data';
    import { watch } from 'vue'
    import { findInCircle, getAttr } from '@/use/util'
    import DM from '@/use/data-manager'
    import { storeToRefs } from 'pinia'

    const app = useApp()
    const { hoverX, hoverY } = storeToRefs(app)

    const props = defineProps({
        selected: {
            type: Array,
            default: () => ([])
        },
        time: {
            type: Number,
            required: false
        },
        update: {
            type: Number,
            required: false
        },
        width: {
            type: Number,
            default: 500
        },
        height: {
            type: Number,
            default: 500
        },
        xAttr: {
            type: String,
            default: "x"
        },
        yAttr: {
            type: String,
            default: "y"
        },
        colorAttr: {
            type: String,
            required: false
        },
        opacityAttr: {
            type: String,
            required: false
        },
        colorType: {
            type: Number,
            default: 1
        },
        colorScale: {
            type: Function
        },
        radius: {
            type: Number,
            default: 4
        },
        showLens: {
            type: Boolean,
            default: false
        },
        searchRadius: {
            type: Number,
            default: 20,
        },
        fixedLens: {
            type: Boolean,
            default: false
        },
        highlightColor: {
            type: String,
            default: "blue"
        }
    })

    const emit = defineEmits(["move", "hover", "click", "right-click", "click-lens"])

    const el = ref(null)
    const overlay = ref(null)

    let _data = [], tree;
    let ctx;
    let x, y, colors, opacities;

    let dataIds = new Set()

    const getX = d => getAttr(d, props.xAttr)
    const getY = d => getAttr(d, props.yAttr)
    const getC = d => props.colorAttr ? getAttr(d, props.colorAttr) : "darkgreen"
    const getO = d => props.opacityAttr ? getAttr(d, props.opacityAttr) : 1
    const getColor = d => colors ? colors(getC(d)) : "darkgreen"
    const getOpacity = d => opacities ? opacities(getO(d)) : 1

    function draw() {
        ctx.clearRect(0, 0, props.width, props.height)
        _data.forEach(d => {
            if (dataIds.size > 0 && !dataIds.has(d.id)) return
            ctx.globalAlpha = getOpacity(d)
            ctx.beginPath()
            const c = getColor(d)
            ctx.fillStyle = c
            ctx.strokeStyle =  c ? d3.color(c).darker() : "black"
            ctx.arc(x(getX(d)), y(getY(d)), props.radius, 0, Math.PI*2)
            ctx.fill()
            ctx.stroke()
        })
    }

    function drawLens(lenses=[]) {
        const svg = d3.select(overlay.value)
        svg.selectAll("*").remove()

        if (!props.fixedLens) return

        svg.selectAll(".lens")
            .data(lenses)
            .join("circle")
            .classed("lens", true)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => d.radius)
            .attr("fill", d => d.color ? d.color : "black")
            .attr("fill-opacity", 0.1)
            .attr("stroke", "none")
    }

    function drawPointsOverlay(points=[]) {
        const svg = d3.select(overlay.value)
        if (points.length === 0) {
            svg.selectAll(".point").remove()
        } else {
            svg.selectAll(".point")
                .data(points)
                .join("circle")
                .classed("point", true)
                .attr("cx", d => x(getX(d)))
                .attr("cy", d => y(getY(d)))
                .attr("r", props.radius+2)
                .attr("fill", d => getColor(d))
                .attr("stroke", d => {
                    const c = getColor(d)
                    return c ? d3.color(c).darker() : "black"
                })
        }
    }

    function getLensData(mx, my, radius=props.searchRadius) {
        return findInCircle(tree, mx, my, radius)
    }

    function getLensAt(mx, my) {
        for (let i = 0; i < DM.lenses.length; ++i) {
            const l = DM.lenses[i]
            if ((mx-l.x)**2 < l.radius**2 && (my-l.y)**2 < l.radius**2) {
                return l
            }
        }
        return null
    }

    function onHover() {
        const points = getLensData(hoverX.value, hoverY.value, props.radius+3)
        drawPointsOverlay(points)
        emit("hover", hoverX.value, hoverY.value, points, event)
    }
    function onMove(event) {
        const [mx, my] = d3.pointer(event, el.value)
        if (props.showLens && props.fixedLens) {
            // const l = getLensAt(mx, my)
            // drawLens(l !== null ? [l] : [])
            const points = getLensData(mx, my, props.radius+3)
            drawPointsOverlay(points)
            emit("hover", mx, my, points, event)
        } else {
            emit("hover", mx, my)
        }
    }
    function onClick(event) {
        const [mx, my] = d3.pointer(event, el.value)
        if (props.showLens) {
            const l = getLensAt(mx, my)
            if (l !== null) {
                emit("click-lens", mx, my, l.id)
            }
        } else {
            const res = getLensData(mx, my).map(d => d.id)
            emit("click", res, mx, my)
        }
    }

    function makeColorScale() {
        if (props.colorScale !== undefined) {
            colors = props.colorScale
        } else if (props.colorAttr) {
            let scale, vals;
            switch (props.colorType) {
                default:
                case DATA_TYPES.BOOLEAN:
                case DATA_TYPES.NOMINAL:
                    scale = d3.scaleOrdinal(d3.schemeCategory10).unknown("black")
                    vals = Array.from(new Set(_data.map(getC)).values())
                    vals.sort((a, b) => a-b)
                    break
                case DATA_TYPES.ORDINAL:
                    scale = d3.scaleOrdinal(d3.schemeBlues[9]).unknown("black")
                    vals = Array.from(new Set(_data.map(getC)).values())
                    vals.sort((a, b) => a-b)
                    break;
                case DATA_TYPES.SEQUENTIAL:
                    scale = d3.scaleSequential(d3.interpolatePlasma).unknown("black")
                    vals = d3.extent(_data, getC)
                    break;
            }
            colors = scale.domain(vals)
        } else {
            colors = null;
        }

        if (props.opacityAttr) {
            opacities = d3.scaleLinear()
                .domain(d3.extent(_data, getO))
                .range([0.01, 1])
        } else {
            opacities = null
        }
    }

    function updateSelected() {
        dataIds = new Set(props.selected)
        draw()
    }

    function init() {
        _data = DM.getData(true)
        const off = props.radius + 2

        x = d3.scaleLinear()
            .domain(d3.extent(_data, getX))
            .range([off, props.width - off])

        y = d3.scaleLinear()
            .domain(d3.extent(_data, getY))
            .range([props.height - off, off])

        tree = d3.quadtree()
            .x(d => x(getX(d)))
            .y(d => y(getY(d)))
            .addAll(_data)

        ctx = ctx ? ctx : el.value.getContext("2d")

        makeColorScale()

        draw()

        updateSelected()
    }

    defineExpose({ getLensData })

    onMounted(init)

    // watch(() => props.fixedLens, function(val) {
    //     if (val === false) {
    //         drawLens()
    //     }
    // })
    watch(() => ([props.colorAttr, props.colorScale, props.colorType]), function() {
        makeColorScale()
        updateSelected()
    }, { deep: true })

    watch(() => props.selected, updateSelected)
    watch(() => props.time, init)
    watch(() => props.update, function() {
        _data = DM.getData(false)
        makeColorScale()
        updateSelected()
    })

    watch(() => ([hoverX.value, hoverY.value]), onHover)
</script>

<style scoped>
.overlay {
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 0;
}
</style>