<template>
    <Teleport to="body">
        <svg ref="el" class="overlay"
            :width="width"
            :height="height"
            :style="{
                left: tx+'px',
                top: ty+'px',
                pointerEvents: moveLens ? 'none' : 'all'
            }">
        </svg>
    </Teleport>
</template>

<script setup>
    import * as d3 from 'd3'
    import DM from '@/use/data-manager'
    import { useWindowScroll } from '@vueuse/core'
    import { onMounted, useTemplateRef, watch } from 'vue'
    import { deg2rad, getAttr, rad2deg } from '@/use/util'
    import { useApp } from '@/stores/app'
    import { storeToRefs } from 'pinia'
    import { ACTION_TARGET } from '@/use/annotation/action-target'

    const app = useApp()
    const { moveLens } = storeToRefs(app)

    const props = defineProps({
        target: {
            type: String,
            required: true
        },
        indices: {
            type: Array,
            required: true
        },
        mode: {
            type: String,
            required: true
        },
        radius: {
            type: Number,
            required: true
        },
        drawMode: {
            type: String,
            default: "scatter"
        },
        activeLens: {
            type: Number,
            default: 0
        },
        indexPrimary: {
            type: Number,
            default: 0
        },
        indexSecondary: {
            type: Number,
            default: 0
        },
        size: {
            type: Number,
            default: 3
        },
        time: {
            type: Number,
            default: 0
        },
        drawMini: {
            type: Boolean,
            default: false
        }
    })

    const emit = defineEmits(["click-lens", "click-mini", "click-label"])

    const el = useTemplateRef("el")

    const tx = ref(0)
    const ty = ref(0)

    let offX = 15, offY = 15
    let tw = 0, th = 0;

    const width = ref(100)
    const height = ref(100)

    const scroll = useWindowScroll()

    function getColumnIndices(lens, index) {
        if (index <= 0) {
            return d3.range(0, Math.min(props.size, lens.numResults[props.mode]))
        }
        return d3.range(index-1, Math.min(index+props.size-1, lens.numResults[props.mode]))
    }

    function update() {
        const el = document.querySelector("#"+props.target)
        if (!el) return
        const rect = el.getBoundingClientRect()
        width.value = rect.width + offX*2
        height.value = rect.height + offY*2
        tx.value = rect.left - offX
        ty.value = rect.top - offY
        tw = rect.width
        th = rect.height
        // draw lenses
        draw()
    }

    function draw() {
        if (DM.lenses.length === 0) return
        const lenses = props.indices
            .map(i => DM.lenses[i])
            .filter(d => d.x !== null && d.y !== null)


        const svg = d3.select(el.value)
        svg.selectAll("*").remove()

        svg.on("pointermove", function(event) {
            const el = document.querySelector("#"+props.target)
            const [mx, my] = d3.pointer(event, el)
            app.hoverX = mx
            app.hoverY = my
        })

        if (lenses.length === 0) return


        const lg = svg.append("g")
            .selectAll(".lens")
            .data(lenses)
            .join("g")
            .classed("lens", true)
            .attr("transform", d => `translate(${offX+d.x},${offY+d.y})`)

        lg.append("circle")
            .classed("lens-circle", true)
            .attr("data-target-type", ACTION_TARGET.SELECTION)
            .attr("data-target-id", DM.selections[0].id) // TODO: hardcoded because lens and lens selection are split
            .attr("data-target-selections", DM.selections[0].id)
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", d => d.radius)
            .attr("stroke", d => d.color ? d.color : "black")
            .attr("fill", "none")
            .attr("fill-opacity", 0.1)
            .attr("stroke-width", 2)
            .on("pointermove", function(_event, d) {
                d3.select(this).attr("fill", d.color ? d.color : "black")
            })
            .on("pointerleave", function() {
                d3.select(this).attr("fill", "none")
            })
            .on("click", function(_event, d) {
                emit("click-lens", d.id)
            })

        const prim = lenses[0]
        const sec = lenses.length > 1 ? lenses[1] : null

        const ttx = tx.value
        const tty = ty.value

        const getDegrees = (ax, ay, bx, by, r, idx) => {
            const vx = ax - bx
            const vy = ay - by
            const norm = Math.sqrt(vx*vx + vy*vy)

            const nx = bx + (-vx / norm) * r
            const ny = by + (-vy / norm) * r

            let m;
            const minDist = idx === 0 ? r + 25 : r + props.radius*2 + 25
            const minStep = idx === 0 ? props.radius : minDist

            if (norm < minDist && (Math.abs(vx) < minStep || Math.abs(vy) < minStep)) {
                m = (360 + rad2deg(Math.atan2(ny-by, nx-bx))) % 360
            } else {
                if (bx+r+props.radius*2+15 > ttx+width.value-offX*2) {
                    m = 180;
                } else if (bx-r-props.radius*2-15 < ttx) {
                    m = 0;
                } else {
                    m = bx > ax ? 0 : 180
                }
            }

            const onright = m <= 90 || m >= 270
            // debug: show vector lines
            if (false) {
                svg.append("line")
                    .attr("x1", ax)
                    .attr("y1", ay)
                    .attr("x2", bx)
                    .attr("y2", by)
                    .attr("stroke", "magenta")
                    .attr("stroke-width", 2)

                svg.append("line")
                    .attr("x1", nx)
                    .attr("y1", ny)
                    .attr("x2", bx)
                    .attr("y2", by)
                    .attr("stroke", "lime")
                    .attr("stroke-width", 2)
            }

            return [(360 + m + (onright ? -55 : 55)) % 360, m, (360 + m + (onright ? 55 : -55)) % 360]
        }

        if (props.drawMini) {

            const degrees = [
                sec !== null ?
                    getDegrees(ttx+sec.x, tty+sec.y, ttx+prim.x, tty+prim.y, prim.radius, 0).map(deg2rad) :
                    [305, 0, 55].map(deg2rad),
                sec !== null ?
                    getDegrees(ttx+prim.x, tty+prim.y, ttx+sec.x, tty+sec.y, sec.radius, 1).map(deg2rad) :
                    [],
            ]

            const colorColumn = prim.getResultColumn(props.mode, props.indexPrimary)
            const selectedColumn = props.activeLens === 1 ?
                sec.getResultColumn(props.mode, props.indexSecondary) :
                colorColumn

            // draw additional vis
            switch(props.drawMode) {
                default:
                case "scatter":
                    drawScatter(prim, degrees[0], 0, selectedColumn, colorColumn)
                    if (sec !== null) {
                        drawScatter(sec, degrees[1], 1, selectedColumn, colorColumn)
                    }
                    break
                case "chart":
                    drawMicroVis(prim, degrees[0], 0, selectedColumn, colorColumn)
                    if (sec !== null) {
                        drawMicroVis(sec, degrees[1], 1, selectedColumn, colorColumn)
                    }
                    break
            }
        }

    }

    function drawScatter(l, radian, index, selectedColumn, colorColumn) {

        const svg = d3.select(el.value)

        const active = index === props.activeLens
        const ci = getColumnIndices(l, index === 0 ? props.indexPrimary : props.indexSecondary)
        const ldata = ci
            .map(i => l.getResultColumn(props.mode, i))
            .filter(d => d !== null)

        if (!ldata || ldata.length === 0) return

        const dx = l.x + offX
        const dy = l.y + offY
        const r = l.radius + props.radius + 5

        // do not draw lens if the radius is too small
        if (props.radius < 10) return

        ldata.forEach((name, i) => {

            const deg = rad2deg(radian[i])
            const onright = deg <= 90 || deg >= 270
            const bot = deg >= 60 && deg <= 120, top = deg >= 240 && deg <= 300
            const topOrBot = top || bot

            const trigX = Math.cos(radian[i])
            const trigY = Math.sin(radian[i])
            const diffX = r * trigX
            const diffY = r * trigY

            const g = svg.append("g")
                .attr("font-size", 12)
                .attr("opacity", name === selectedColumn ? 1 : 0.7)
                .on("pointerenter", function() {
                    d3.select(this).attr("opacity", 1)
                })
                .on("pointerleave", function() {
                    d3.select(this).attr("opacity", active && name === selectedColumn ? 1 : 0.7)
                })

            g.append("circle")
                .attr("cx", dx + diffX)
                .attr("cy", dy + diffY)
                .attr("r", props.radius)
                .attr("fill", "white")
                .attr("stroke", l.color ? l.color : "black")
                .attr("stroke-width", name === colorColumn ? 3 : 2)
                .on("click", function() {
                    emit("click-mini", index, ci[i])
                })

            const scale = DM.scales[name]
            const points = l.getResultData()

            const sf = 1 - (props.radius / l.radius)

            g.append("g")
                .selectAll("circle")
                .data(points)
                .join("circle")
                .attr("cx", d => {
                    const px = DM.x(d.x)
                    return px + offX + diffX + (l.x - px) * sf
                })
                .attr("cy", d => {
                    const py = DM.y(d.y)
                    return py + offY + diffY + (l.y - py) * sf
                })
                .attr("r", 3)
                .attr("fill", d => scale(getAttr(d, name)))
                .attr("stroke", d => d3.color(scale(getAttr(d, name))).darker(1))

            g.append("text")
                .attr("x", dx + diffX + (props.radius+5) * trigX)
                .attr("y", dy + diffY + (props.radius+5) * trigY + (bot ? 8 : 0))
                .attr("text-anchor", topOrBot ? "middle" : (onright ? "start" : "end"))
                .attr("stroke", "white")
                .attr("stroke-width", 3)
                .attr("fill", "black")
                .attr("paint-order", "stroke")
                .attr("font-weight", name === selectedColumn ? "bold" : null)
                .text(name)
                .style("cursor", "pointer")
                .on("click", function() {
                    emit("click-label", index, ci[i])
                })
        })
    }

    function drawMicroVis(l, radian, index, selectedColumn) {

        const svg = d3.select(el.value)

        const active = index === props.activeLens
        const ci = getColumnIndices(l, index === 0 ? props.indexPrimary : props.indexSecondary)
        const ldata = ci
            .map(i => l.getResultColumn(props.mode, i))
            .filter(d => d !== null)

        if (!ldata || ldata.length === 0) return

        const hists = ci.map(i => l.getResultHist(props.mode, i))

        const dx = l.x + offX
        const dy = l.y + offY
        const rw = Math.floor(props.radius * 2.5)
        const rh = Math.floor(rw * 0.5)
        const r = l.radius + 10

        // do not draw lens if the radius is too small
        if (l.radius < 10) return

        ldata.forEach((name, i) => {

            const deg = rad2deg(radian[i])
            const onright = deg <= 90 || deg >= 270
            const bot = deg >= 60 && deg <= 120, top = deg >= 240 && deg <= 300
            const topOrBot = top || bot

            const trigX = Math.cos(radian[i])
            const trigY = Math.sin(radian[i])
            const diffX = r * trigX
            const diffY = r * trigY

            const g = svg.append("g")
                .attr("font-size", 12)
                .attr("opacity", active && name === selectedColumn ? 1 : 0.7)

            const offX = dx + diffX + (onright ? 5 : -rw-5)
            const offY = dy + diffY - rh*0.5

            const sx = d3.scaleBand()
                .domain(hists[i].map(d => d.x))
                .range([0, rw])

            const sy = d3.scaleLinear()
                .domain([0, 1])
                .range([rh, 0])

            g.append("rect")
                .attr("x", offX)
                .attr("y", offY)
                .attr("width", rw)
                .attr("height", rh)
                .attr("fill", "white")
                .attr("stroke", "none")
                .on("click", function() {
                    emit("click-mini", index, ci[i])
                })

            g.append("g")
                .selectAll("rect")
                .data(hists[i])
                .join("rect")
                .attr("x", d => offX + sx(d.x))
                .attr("y", d => offY + sy(d.y))
                .attr("width", sx.bandwidth())
                .attr("height", d => sy(0) - sy(d.y))
                .attr("fill", d => d.color)
                .attr("stroke", "none")

            g.append("rect")
                .attr("x", offX)
                .attr("y", offY)
                .attr("width", rw)
                .attr("height", rh)
                .attr("fill", "none")
                .attr("stroke", l.color ? l.color : "black")
                .attr("stroke-width", name === selectedColumn ? 2 : 1)

            g.append("text")
                .attr("x", offX + (topOrBot ? rw * 0.5 : (onright ? rw+5 : -5)))
                .attr("y", offY + (top ? -10 : (bot ? rh+15 : rh * 0.5 + 5)))
                .attr("text-anchor", topOrBot ? "middle" : (onright ? "start" : "end"))
                .attr("stroke", "white")
                .attr("stroke-width", 3)
                .attr("fill", "black")
                .attr("paint-order", "stroke")
                .attr("font-weight", name === selectedColumn ? "bold" : null)
                .text(name)
                .style("cursor", "pointer")
                .on("click", function() {
                    emit("click-label", index, ci[i])
                })
        })
    }

    onMounted(update)

    watch(props, update)
    watch(width, update)
    watch(height, update)

    watch(scroll.y, update)

</script>

<style scoped>
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 200;
}
</style>