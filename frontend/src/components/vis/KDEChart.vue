<template>
    <svg ref="el" :width="width" :height="height"></svg>
</template>

<script setup>
    import * as d3 from 'd3'
    import { getAttr } from '@/use/util';
    import { onMounted } from 'vue';

    const props = defineProps({
        data: {
            type: Array,
            required: true
        },
        binned: {
            type: Array,
            required: true
        },
        width: {
            type: Number,
            default: 200
        },
        height: {
            type: Number,
            default: 100
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
        },
        fillColor: {
            type: String,
            default: "darkgreen"
        },
        selectable: {
            type: Boolean,
            default: false
        }
    })

    const emit = defineEmits(["click", "right-click"])

    const el = ref(null)

    const getX = d => getAttr(d, props.xAttr)
    const getY = d => getAttr(d, props.yAttr)
    const getC = d => getAttr(d, props.colorAttr)


    function kde(kernel, thresholds, data) {
        return thresholds.map(t => [t, d3.mean(data, d => kernel(t - d))]);
    }
    function epanechnikov(bandwidth) {
        return x => Math.abs(x /= bandwidth) <= 1 ? 0.75 * (1 - x * x) / bandwidth : 0;
    }

    function draw() {
        const svg = d3.select(el.value)
        svg.selectAll("*").remove()

        const off = 25;

        const data = props.data.map(getY)

        const t = d3.ticks(...d3.nice(...d3.extent(data), 10), Math.floor(props.width / 5))
        const result = kde(epanechnikov(1.5), t, data)

        const x = d3.scaleLinear()
            .domain([t.at(0), t.at(-1)])
            .range([5, props.width-5])

        const y = d3.scaleLinear()
            .domain([0, d3.max(props.binned, getY) / props.data.length])
            .range([props.height-5-off, 5])

        const path = d3.line()
            .curve(d3.curveCardinal)
            .x(d => x(d[0]))
            .y(d => y(d[1]))

        // BARS
        const xb = d3.scaleBand()
            .domain(Array.from(new Set(props.binned.map(getX))))
            .range([5, props.width-5])
            .paddingInner(0.1)

        svg.append("g")
            .selectAll("rect")
            .data(props.binned)
            .join("rect")
            .attr("x", d => xb(getX(d)))
            .attr("y", d => y(getY(d) / props.data.length))
            .attr("width", xb.bandwidth())
            .attr("height", d => y(0) - y(getY(d) / props.data.length))
            .attr("fill", d => props.colorAttr ? getC(d) : props.fillColor)

        // CURVE
        svg.append("path")
            .attr("d", path(result))
            .attr("stroke", "black")
            .attr("stroke-wdith", 2)
            .attr("fill", "none")

        svg.append("g")
            .attr("transform", `translate(0,${props.height-off})`)
            .call(d3.axisBottom(x).ticks(5))
    }


    onMounted(draw)

    watch(props, draw, { deep: true })
</script>