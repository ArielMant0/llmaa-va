<template>
    <div class="d-flex align-center justify-space-between" style="width: 100%;">
        <canvas class="minicanvas" ref="cMove" :width="width" :height="height"></canvas>
        <canvas class="minicanvas" ref="cMoveTrails" :width="width" :height="height"></canvas>
        <canvas class="minicanvas" ref="cHover" :width="width" :height="height"></canvas>
        <canvas class="minicanvas" ref="cHoverTrails" :width="width" :height="height"></canvas>
        <canvas class="minicanvas" ref="cClick" :width="width" :height="height"></canvas>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'

    const props = defineProps({
        move: {
            type: Array,
            required: true
        },
        hover: {
            type: Array,
            required: true
        },
        click: {
            type: Array,
            required: true
        },
        width: {
            type: Number,
            default: 100,
        },
        height: {
            type: Number,
            default: 100,
        }
    })

    const cMove = ref(null)
    const cMoveTrails = ref(null)
    const cHover = ref(null)
    const cHoverTrails = ref(null)
    const cClick = ref(null)

    let cm, cmt, ch, cht, cc;

    let x, y;

    function makeContours(data) {
        return d3.contourDensity()
            .x(d => x(d[0]))
            .y(d => y(d[1]))
            .size([props.width, props.height])
            .bandwidth(16)
            .thresholds(16)
            (data);
    }

    function onMove() {
        drawMove()
        drawMoveTrails()
    }

    function drawMove() {
        if (!cm) cm = cMove.value.getContext("2d")

        cm.clearRect(0, 0, props.width, props.height)
        const contours = makeContours(props.move)

        const path = d3.geoPath().context(cm)
        const colors = d3.scaleSequential(d3.interpolateViridis)
            .domain(d3.extent(contours, d => d.value))

        contours.forEach(d => {
            cm.beginPath()
            cm.fillStyle = colors(d.value)
            path(d)
            cm.fill()
        })
    }

    function drawMoveTrails() {
        if (!cmt) cmt = cMoveTrails.value.getContext("2d")

        cmt.clearRect(0, 0, props.width, props.height)
        const path = d3.line()
            .curve(d3.curveCardinal.tension(0.5))
            .context(cmt)
            .x(d => x(d[0]))
            .y(d => y(d[1]))

        const colors = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, props.move.length-1])

        cmt.globalAlpha = 0.5
        for (let i = 0; i < props.move.length-1; ++i) {
            cmt.strokeStyle = colors(i)
            cmt.beginPath()
            path([props.move[i], props.move[i+1]])
            cmt.stroke()
        }
    }

    function onHover() {
        drawHover()
        drawHoveTrails()
    }

    function drawHover() {
        if (!ch) ch = cHover.value.getContext("2d")

        ch.clearRect(0, 0, props.width, props.height)
        const contours = makeContours(props.hover)
        const path = d3.geoPath().context(ch)
        const colors = d3.scaleSequential(d3.interpolateViridis)
            .domain(d3.extent(contours, d => d.value))

        contours.forEach(d => {
            ch.beginPath()
            ch.fillStyle = colors(d.value)
            path(d)
            ch.fill()
        })
    }

    function drawHoveTrails() {
        if (!cht) cht = cHoverTrails.value.getContext("2d")

        cht.clearRect(0, 0, props.width, props.height)
        const path = d3.line()
            .curve(d3.curveCardinal.tension(0.5))
            .context(cht)
            .x(d => x(d[0]))
            .y(d => y(d[1]))

        const colors = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, props.hover.length-1])

        cht.globalAlpha = 0.5
        for (let i = 0; i < props.hover.length-1; ++i) {
            cht.strokeStyle = colors(i)
            cht.beginPath()
            path([props.hover[i], props.hover[i+1]])
            cht.stroke()
        }
    }

    function drawClick() {
        if (!cc) cc = cClick.value.getContext("2d")

        cc.clearRect(0, 0, props.width, props.height)
        cc.globalAlpha = 0.1
        cc.fillStyle = "blue"
        props.click.forEach(d => {
            cc.beginPath()
            cc.arc(x(d[0]), y(d[1]), 4, 0, Math.PI*2)
            cc.fill()
        })
    }

    function init() {
        x = d3.scaleLinear()
            .domain([0, 1])
            .range([0, props.width])
        y = d3.scaleLinear()
            .domain([0, 1])
            .range([0, props.height])

        onMove()
        onHover()
        drawClick()
    }

    onMounted(init)

    watch(() => props.move, onMove)
    watch(() => props.hover, onHover)
    watch(() => props.click, drawClick)
</script>

<style scoped>
.minicanvas {
    border: 1px solid grey;
}
</style>
