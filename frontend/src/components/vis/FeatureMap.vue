<template>
    <canvas ref="el" :width="width" :height="height"></canvas>
</template>

<script setup>
    import DM from '@/use/data-manager';
    import { LENS_TYPE } from '@/use/Lens';
    import { getAttr } from '@/use/util';
    import * as d3 from 'd3'
    import { onMounted, watch } from 'vue';

    const props = defineProps({
        column:{
            type: String,
            required: true
        },
        mode:{
            type: String,
            required: true
        },
        lensType: {
            type: Number,
            required: true
        },
        idAttr:{
            type: String,
            default: "id"
        },
        xAttr:{
            type: String,
            default: "x"
        },
        yAttr:{
            type: String,
            default: "y"
        },
        time:{
            type: Number,
            default: 0
        },
        width: {
            type: Number,
            default: 500
        },
        height: {
            type: Number,
            default: 500
        },
        hide: {
            type: Boolean,
            default: false
        }
    })

    const el = ref(null)

    let ctx;

    function draw() {
        if (!ctx) ctx = el.value.getContext("2d")

        ctx.clearRect(0, 0, props.width, props.height)

        if (props.hide === true || !DM.featureMaps || !DM.featureMaps[props.column]) return

        const map = DM.featureMaps[props.column][props.mode]

        const x = d3.scaleLinear()
            .domain(d3.extent(DM.data, d => getAttr(d, props.xAttr)))
            .range([0, props.width])

        const y = d3.scaleLinear()
            .domain(d3.extent(DM.data, d => getAttr(d, props.yAttr)))
            .range([props.height, 0])

        const points = DM.data
            .filter(d => (DM.filterIds.size === 0 || DM.filterIds.has(getAttr(d, props.idAttr))) && map.has(getAttr(d, props.idAttr)))
            .map(d => ([getAttr(d, props.xAttr), getAttr(d, props.yAttr), map.get(getAttr(d, props.idAttr))]))

        const contours = d3.contourDensity()
            .x(d => x(d[0]))
            .y(d => y(d[1]))
            .weight(d => props.lensType === LENS_TYPE.FREQUENT ? 1 - d[2] : d[2])
            .size([props.width, props.height])
            .bandwidth(30)
            .thresholds(16)
            (points)

        let ex = d3.extent(contours, d => d.value)
        // if (props.lensType === LENS_TYPE.FREQUENT) {
        //     ex = ex.reverse()
        // }
        const tScale = d3.scaleLinear().domain(ex).range([0, 1])
        const colors = d3.scaleSequential(d3.interpolateGreys).domain([0, 1])
            // .domain(props.lensType === LENS_TYPE.RARE ? [0, 0.1] : [0.1, 0])

        const path = d3.geoPath().context(ctx)

        contours.forEach(d => {
            ctx.beginPath()
            const cs = d3.color(colors(1-tScale(d.value)))
            cs.opacity = 0.05
            ctx.strokeStyle = cs.formatRgb()
            ctx.fillStyle = colors(tScale(d.value))
            path(d)
            ctx.fill()
            ctx.stroke()
        })
    }

    onMounted(draw)

    watch(props, draw)
</script>