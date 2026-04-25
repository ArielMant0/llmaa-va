<template>
    <svg ref="el" :width="width" :height="height"></svg>
</template>

<script setup>
    import { useTooltip } from '@/stores/tooltip';
    import { getAttr, uid } from '@/use/util';
    import * as d3 from 'd3'
    import { onMounted } from 'vue';

    const tt = useTooltip()

    const props = defineProps({
        data: {
            type: Array,
            required: true
        },
        selected: {
            type: Array,
            default: () => ([])
        },
        title: {
            type: String,
            required: false
        },
        width: {
            type: Number,
            default: 200
        },
        height: {
            type: Number,
            default: 120
        },
        xAttr: {
            type: String,
            default: "x"
        },
        yAttr: {
            type: String,
            default: "y"
        },
        yDomain: {
            type: Array,
            required: false
        },
        colorAttr: {
            type: String,
        },
        patternAttr: {
            type: String,
        },
        labelAttr: {
            type: String,
        },
        fillColor: {
            type: String,
            default: "darkgreen"
        },
        selectable: {
            type: Boolean,
            default: false
        },
        formatY: {
            type: Function,
            default: d => Math.round(d*100).toFixed(0) + "%"
        }
    })

    const emit = defineEmits(["click", "right-click"])

    const el = ref(null)

    const getX = d => getAttr(d, props.xAttr)
    const getY = d => getAttr(d, props.yAttr)
    const getC = d => getAttr(d, props.colorAttr)
    const getP = d => getAttr(d, props.patternAttr)

    const textY = d => props.formatY(getY(d)) + (props.labelAttr ? ` (${getAttr(d, props.labelAttr)})` : "")

    function draw() {
        const svg = d3.select(el.value)
        svg.selectAll("*").remove()

        const off = 20;

        const x = d3.scaleBand()
            .domain(Array.from(new Set(props.data.map(getX))))
            .range([5, props.width-5])
            .paddingInner(0.1)

        const y = d3.scaleLinear()
            .domain(props.yDomain ? props.yDomain : [0, d3.max(props.data, getY)])
            .range([props.height-5-off, 5])

        const set = new Set(props.selected)
        const patternUIDs = new Map()

        if (props.patternAttr) {

            const xs = x.bandwidth()
            const ys = Math.floor((props.height-10-off) / 5) + 1

            x.domain().forEach(xi => {

                patternUIDs.set(xi, uid("pb_"))

                const p = svg.append("mask")
                    .attr("id", patternUIDs.get(xi))
                    .attr("maskUnits", "userSpaceOnUse")
                    .attr("x", "0%")
                    .attr("y", "0%")
                    .attr("width", "100%")
                    .attr("height", "100%")
                // .attr("maskContentUnits", "objectBoundingBox")

                // p.append("rect")
                //     .attr("x", 5)
                //     .attr("y", 5)
                //     .attr("width", xs+5)
                //     .attr("height", props.height-10-off)
                //     .attr("fill", "white")

                p.selectAll("rect")
                    .data(d3.range(0, ys))
                    .join("rect")
                    .attr("fill", "white")
                    .attr("stroke", "none")
                    .attr("x", x(xi))
                    .attr("y", d => d*5)
                    .attr("width", xs)
                    .attr("height", 4)
            })
        }

        svg.append("g")
            .selectAll("rect")
            .data(props.data)
            .join("rect")
            .attr("x", d => x(getX(d)))
            .attr("y", d => getY(d) > 0 ? Math.min(y(0)-2, y(getY(d))) : 0)
            .attr("width", x.bandwidth())
            .attr("height", d => getY(d) > 0 ? Math.max(2, y(0) - y(getY(d))) : 0)
            .attr("stroke", d => d3.hsl(props.colorAttr ? getC(d) : props.fillColor).darker(2))
            .attr("stroke-width", 1)
            .attr("fill", d => {
                const col = props.colorAttr ? getC(d) : props.fillColor
                if (props.patternAttr && getP(d)) {
                    const hsl = d3.hsl(col)
                    return hsl.l < 0.45 ? hsl.brighter(1) : hsl.darker(1.5)
                }
                return col
            })
            .attr("mask", d => props.patternAttr && getP(d) ? `url(#${patternUIDs.get(getX(d))})` : null)
            .attr("opacity", d => set.size > 0 && !set.has(getX(d)) ? 0.5 : 1)
            .style("cursor", props.selectable ? "pointer" : null)
            .on("pointerenter", function() {
                if (props.selectable) {
                    d3.select(this).attr("stroke", "black")
                }
            })
            .on("pointermove", function(event, d) {
                const [mx, my] = d3.pointer(event, document.body)
                const extra = props.title ? props.title+" ⇒ " : ""
                if (d.x1) {
                    tt.show(`${extra}${getX(d)} - ${d.x1}: ${textY(d)}`, mx, my)
                } else {
                    tt.show(`${extra}${getX(d)}: ${textY(d)}`, mx, my)
                }
            })
            .on("pointerleave", function(_, d) {
                if (props.selectable) {
                    d3.select(this).attr("stroke", d3.hsl(props.colorAttr ? getC(d) : props.fillColor).darker(2))
                }
                tt.hide()
            })
            .on("click", (_event, d) => {
                emit("click", d)
            })
            .on("contextmenu", (event, d) => {
                event.preventDefault()
                emit("right-click", d)
            })

        svg.append("g")
            .attr("transform", `translate(0,${props.height-off})`)
            .call(d3.axisBottom(x))
            .selectAll(".tick text")
            .text(d => {
                const t = (""+d).replaceAll("_", " ")
                return t.length*5 > x.bandwidth() ? t.slice(0, Math.floor(x.bandwidth() / 5))+'..' : t
            })
            .style("cursor", props.selectable ? "pointer" : null)
            .classed("hover-bold", props.selectable)
            .on("click", (_event, d) => {
                emit("click", { x: d, y: 0 })
            })
            .on("contextmenu", (event, d) => {
                event.preventDefault()
                emit("right-click", { x: d, y: 0 })
            })
    }

    onMounted(draw)

    watch(props, draw, { deep: true })
</script>