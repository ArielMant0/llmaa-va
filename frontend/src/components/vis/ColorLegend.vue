<template>
    <svg ref="el" :width="width" :height="height"></svg>
</template>

<script setup>
    import * as d3 from 'd3'
    import { onMounted, watch } from 'vue';

    const props = defineProps({
        scale: {
            type: Function,
            required: true
        },
        selected: {
            type: Array,
            default: () => ([])
        },
        tickFormat: {
            type: Function,
            required: false
        },
        tickValues: {
            type: Array,
            required: false
        },
        numTicks: {
            type: Number,
            required: false
        },
        refresh: {
            type: Number,
            default: 0
        },
        width: {
            type: Number,
            default: 300
        },
        height: {
            type: Number,
            default: 60
        },
    })

    const emit = defineEmits(["brush", "click"])

    const el = ref(null)

    let x, rects, brushG, brush, brushVals;

    function ramp(color, n=256) {
        const canvas = document.createElement("canvas");
        canvas.width = n;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        for (let i = 0; i < n; ++i) {
            context.fillStyle = color(i / (n - 1));
            context.fillRect(i, 0, 1, 1);
        }
        return canvas;
    }

    function draw() {

        const margin = 10, ticks = props.numTicks ? props.numTicks : props.width / 25;
        const h = Math.max(10, Math.floor(props.height * 0.5))

        const svg = d3.select(el.value)
        svg.selectAll("*").remove()

        let tickValues = props.tickValues

        // Sequential
        if (props.scale.interpolator) {
            x = Object.assign(props.scale.copy()
                .interpolator(d3.interpolateRound(margin, props.width - margin)),
                { range() { return [margin, props.width - margin]; } });

            const tmp = d3.scaleLinear()
                .domain([margin, props.width - margin])
                .range(x.domain())

            brush = d3.brushY()
                .extent([[margin, margin], [margin+h, props.width-margin]])
                .on("brush", function({ selection, sourceEvent }) {
                    if (sourceEvent) {
                        const vals = selection ? selection.map(d => tmp(d)) : null
                        vals.sort()
                        brushVals = vals.slice()
                        emit("brush", vals)
                    }
                })
                .on("end", function({ selection, sourceEvent }) {
                    if (selection || !sourceEvent) return
                    emit("brush", null)
                })


            svg.append("image")
                .attr("x", margin)
                .attr("y", margin)
                .attr("height", h)
                .attr("width", props.width - margin * 2)
                .attr("preserveAspectRatio", "none")
                .attr("xlink:href", ramp(props.scale.interpolator()).toDataURL())

            svg.append("rect")
                .attr("x", margin)
                .attr("y", margin)
                .attr("height", h)
                .attr("width", props.width - margin * 2)
                .attr("stroke", "black")
                .attr("fill", "none")

            brushG = svg.append("g").call(brush)

            // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
            if (!x.ticks) {
                const n = Math.round(ticks + 1);
                tickValues = d3.range(n).map(i => d3.quantile(props.scale.domain(), i / (n - 1)));
            }

        } else {
            x = d3.scaleBand()
                .domain(props.scale.domain())
                .rangeRound([margin, props.width - margin])
                .paddingInner(0.05)

            rects = svg.append("g")
                .selectAll("rect")
                .data(props.scale.domain())
                .join("rect")
                    .attr("x", x)
                    .attr("y", margin)
                    .attr("width", Math.max(0, x.bandwidth() - 1))
                    .attr("height", h)
                    .attr("fill", props.scale)
                    .style("cursor", "pointer")
                    .on("pointerenter", function() { d3.select(this).style("filter", "saturate(3)") })
                    .on("pointerleave", function() { d3.select(this).style("filter", null) })
                    .on("click", function(_e, d) { emit("click", d) })
        }

        const axis = svg.append("g")
            .attr("transform", `translate(0,${margin+h})`)
            .call(d3.axisBottom(x).ticks(ticks).tickValues(tickValues).tickFormat(props.tickFormat))
            .call(g => g.select(".domain").remove())

        if (props.scale.interpolator) {
            axis.select(".tick text").attr("text-anchor", "start")

            axis.select(".tick:last-child text").attr("text-anchor", "end")
        }

        highlight()
    }

    function highlight() {
        const v = props.selected
        if (props.scale.interpolator) {
            if (v && v.length > 0) {
                if (!brushVals || brushVals[0] !== v[0] || brushVals[1] !== v[1]) {
                    brushVals = v.slice()
                    brushG.call(brush.move, v.map(x));
                }
            } else {
                brushVals = null
                brushG.call(brush.move, null);
            }
        } else {
            rects.attr("stroke", d => v && v.includes(d) ? "black" : null)
        }
    }

    onMounted(draw)

    watch(() => props.selected, highlight)
    watch(() => props.refresh, draw)
</script>