<template>
    <div>
        <div class="mt-2 mb-2">
            <v-text-field v-model="search"
                placeholder="search attributes .."
                density="compact"
                hide-details
                hide-spin-buttons
                clearable
                @update:model-value="drawConnections"
                variant="outlined"/>
        </div>

        <div class="d-flex justify-start align-start" :style="{ maxHeight: (showHotbar ? 70 : 75)+'vh', overflowY: 'auto'}">

            <div :style="{ minWidth: (chartWidth+5)+'px' }">
                <div style="text-align: center;" class="mb-1 text-dots" :style="{ maxWidth: chartWidth+'px' }">
                    <v-icon :color="colorP" class="mr-1" size="small">mdi-circle-outline</v-icon>
                    <span :style="{ fontWeight: activeLens === 0 ? 'bold' : null }">primary</span>
                </div>
                <div v-for="i in fP"
                    class="text-caption"
                    :key="'p_'+colsP[i]+'_'+i"
                    :style="{
                        textAlign: 'center',
                        border: '1px solid ' + (colsP[i] === selectedColumn ? 'black' : 'white'),
                        borderRadius: '4px'
                    }">
                    <div>
                        <div @click="setColor(0, i)" :style="{ maxWidth: (chartWidth-5)+'px' }" class="cursor-pointer text-dots hover-bold">
                            {{ i+1 }}. {{ colsP[i] }}
                        </div>
                        <BarChart
                            :title="colsP[i]"
                            :data="getMerged(0, colsP[i])"
                            :y-domain="[0, 1]"
                            color-attr="color"
                            pattern-attr="pattern"
                            label-attr="group"
                            selectable
                            @click="v => annotate(0, i, v.x)"
                            :width="chartWidth"
                            :height="chartHeight"/>
                    </div>
                </div>
                <v-divider v-if="fOP.length > 0"  color="black" class="mt-1 mb-1" thickness="2" opacity="1"></v-divider>
                <div v-for="i in fOP"
                    class="text-caption"
                    :key="'po_'+colsOtherP[i]+'_'+i"
                    :style="{
                        textAlign: 'center',
                        border: '1px solid ' + (colsOtherP[i] === selectedColumn ? 'black' : 'white'),
                        borderRadius: '4px',
                        backgroundColor: '#eee'
                    }">
                    <div>
                        <div :style="{ maxWidth: (chartWidth-5)+'px' }" class="cursor-pointer text-dots hover-bold">
                            {{ colsOtherP[i] }}
                        </div>
                        <BarChart
                            :title="colsOtherP[i]"
                            :data="histG.get(colsOtherP[i])"
                            :y-domain="[0, 1]"
                            color-attr="color"
                            pattern-attr="pattern"
                            label-attr="group"
                            :width="chartWidth"
                            :height="chartHeight"/>
                    </div>
                </div>
            </div>

            <div>
                <div style="min-height: 24px; text-align: center;"  class="mb-1"></div>
                <svg ref="conns" :width="Math.floor(chartWidth*0.5)" :height="height*numCols"></svg>
            </div>

            <div :style="{ minWidth: (chartWidth+5)+'px' }">
                <div style="text-align: center;" class="mb-1 text-dots" :style="{ maxWidth: chartWidth+'px' }">
                    <v-icon :color="colorS" class="mr-1" size="small">mdi-circle-outline</v-icon>
                    <span :style="{ fontWeight: activeLens === 1 ? 'bold' : null }">secondary</span>
                </div>
                <div v-for="i in fS"
                    class="text-caption"
                    :key="'s_'+colsS[i]+'_'+i"
                    :style="{
                        textAlign: 'center',
                        border: '1px solid ' + (colsS[i] === selectedColumn ? 'black' : 'white'),
                        borderRadius: '4px'
                    }">
                    <div>
                        <div @click="setColor(1, i)" :style="{ maxWidth: (chartWidth-5)+'px' }" class="cursor-pointer text-dots hover-bold">
                            {{ i+1 }}. {{ colsS[i] }}
                        </div>
                        <BarChart
                            :title="colsS[i]"
                            :data="getMerged(1, colsS[i])"
                            :y-domain="[0, 1]"
                            color-attr="color"
                            pattern-attr="pattern"
                            label-attr="group"
                            selectable
                            @click="v => annotate(1, i, v.x)"
                            :width="chartWidth"
                            :height="chartHeight"/>
                    </div>
                </div>
                <v-divider v-if="fOS.length > 0" color="black" class="mt-1 mb-1" thickness="2" opacity="1"></v-divider>
                <div v-for="i in fOS"
                    class="text-caption"
                    :key="'so_'+colsOtherS[i]+'_'+i"
                    :style="{
                        textAlign: 'center',
                        border: '1px solid ' + (colsOtherS[i] === selectedColumn ? 'black' : 'white'),
                        borderRadius: '4px',
                        backgroundColor: '#eee'
                    }">
                    <div>
                        <div :style="{ maxWidth: (chartWidth-5)+'px' }" class="cursor-pointer text-dots hover-bold">
                            {{ colsOtherS[i] }}
                        </div>
                        <BarChart
                            :title="colsOtherS[i]"
                            :data="histG.get(colsOtherS[i])"
                            :y-domain="[0, 1]"
                            color-attr="color"
                            pattern-attr="pattern"
                            label-attr="group"
                            :width="chartWidth"
                            :height="chartHeight"/>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import DM from '@/use/data-manager';
    import { computed, onMounted, reactive, ref, watch } from 'vue';
    import BarChart from './vis/BarChart.vue';
    import { useApp } from '@/stores/app';
    import { calcHistogram } from '@/use/util';
    import { useControls } from '@/stores/controls';
    import { storeToRefs } from 'pinia';
    import { useTooltip } from '@/stores/tooltip';
    import CM from '@/use/command-manager';

    const tt = useTooltip()
    const app = useApp()
    const { activeLens, showHotbar } = storeToRefs(app)

    const controls = useControls()

    const props = defineProps({
        active: {
            type: Boolean,
            default: true
        },
        selectedColumn: {
            type: String,
            required: true
        },
        mode: {
            type: String,
            required: true
        },
        chartWidth: {
            type: Number,
            default: 180
        },
        chartHeight: {
            type: Number,
            default: 60
        },
        time: {
            type: Number,
            default: 0
        },
    })

    const emit = defineEmits(["update"])

    const conns = ref(null)

    const search = ref("")

    const colsP = ref([])
    const colsOtherP = ref([])
    const fP = computed(() => {
        if (search.value && search.value.length > 0) {
            return colsP.value.map((d, i) => d.includes(search.value) ? i : null)
                .filter(d => d !== null)
        }
        return colsP.value.map((_, i) => i)
    })
    const fOP = computed(() => {
        if (search.value && search.value.length > 0) {
            return colsOtherP.value.map((d, i) => d.includes(search.value) ? i : null)
                .filter(d => d !== null)
        }
        return colsOtherP.value.map((_, i) => i)
    })


    const colsS = ref([])
    const colsOtherS = ref([])
    const fS = computed(() => {
        if (search.value && search.value.length > 0) {
            return colsS.value.map((d, i) => d.includes(search.value) ? i : null)
                .filter(d => d !== null)
        }
        return colsS.value.map((_, i) => i)
    })
    const fOS = computed(() => {
        if (search.value && search.value.length > 0) {
            return colsOtherS.value.map((d, i) => d.includes(search.value) ? i : null)
                .filter(d => d !== null)
        }
        return colsOtherS.value.map((_, i) => i)
    })

    const colorP = ref("")
    const colorS = ref("")

    const histG = new Map()

    const numCols = computed(() => Math.max(1, Math.max(fP.value.length+fOP.value.length, fS.value.length+fOS.value.length)))
    const connSet = reactive(new Set())

    const height = computed(() => props.chartHeight + 20 + 8)

    let links = []

    function setColor(lensIndex, columnIndex) {
        app.setColorIndex(lensIndex, columnIndex)
        emit("update")
    }

    function annotate(lensIndex, columnIndex, columnValue=null) {
        // TODO: what to do here?
    }

    function drawConnections() {
        const svg = d3.select(conns.value)
        svg.selectAll("*").remove()

        // const ws = d3.scaleQuantile(links.map(d => d[2])).range([6, 4, 2, 1])

        const path = d3.line()
            .curve(d3.curveBumpX)
            .x(d => d[0])
            .y(d => d[1])

        const data = search.value && search.value.length > 0 ?
            links.map(d => ([fP.value.indexOf(d[0]), fS.value.indexOf(d[1]), d[0], d[1]]))
                .filter(d => d[0] >= 0 && d[1] >= 0) :
            links.map(d => ([d[0], d[1], d[0], d[1]]))

        svg.selectAll("path")
            .data(data)
            .join("path")
            .attr("d", d => path([[2, d[0] * height.value + 15], [Math.floor(props.chartWidth*0.5) - 2, d[1] * height.value + 15]]))
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("opacity", 0.25)
            .attr("stroke-width", 4)
            .style("cursor", "pointer")
            .on("pointermove", function(event, d) {
                const [mx, my] = d3.pointer(event, document.body)
                tt.show(`${colsP.value[d[0]]} ⇒ (${d[0]+1}) - (${d[1]+1})`, mx, my)
            })
            .on("pointerenter", function() {
                d3.select(this).attr("opacity", 0.75)
            })
            .on("pointerleave", function() {
                d3.select(this).attr("opacity", 0.25)
                tt.hide()
            })
            .on("click", function(_event, d) {
                app.setColorIndex(0, d[0])
                app.setColorIndex(1, d[1])
                emit("update")
            })
    }

    function getMerged(index, column) {
        const lens = DM.getLens(index)
        const other = lens.hists[column] ? lens.hists[column] : []
        const data = other.concat(histG.get(column))
        data.sort((a, b) => {
            if (a.x !== b.x) {
                return a.x - b.x
            }
            return b.y - a.y
        })
        return data
    }

    function read() {
        const limit = props.active ? undefined : 5

        const p = DM.getLens(0)
        const s = DM.getLens(1)

        colorP.value = p.color ? p.color : "black"
        colorS.value = s.color ? s.color : "black"
        // get column names (in order, for each lens)
        const pc = p.results[props.mode].map(d => d.name).slice(0, limit)
        const sc = s.results[props.mode].map(d => d.name).slice(0, limit)
        // store connected columns
        links = []

        connSet.clear()
        const inP = new Set(), inS = new Set(sc)

        pc.forEach((c, i) => {
            let j = sc.indexOf(c)
            inP.add(c)
            if (j >= 0) {
                connSet.add(c)
                links.push([i, j, Math.abs(pc[i].value-sc[j].value)])
            }
        })

        if (props.active) {
            const allCols = Array.from(histG.keys())
            colsOtherP.value = allCols.filter(c => !inP.has(c))
            colsOtherS.value = inS.size > 0 ? allCols.filter(c => !inS.has(c)) : []
        } else {
            colsOtherP.value = []
            colsOtherS.value = []
        }

        colsP.value = pc
        colsS.value = sc

        if (props.active) {
            drawConnections()
        } else {
            d3.select(conns.value).selectAll("*").remove()
        }

    }

    function readGlobal() {
        const data = DM.getData()
        DM.columns.forEach((c, i) => {
            const h = calcHistogram(data, c, DM.types[i], DM.filterStats, DM.scales[c])
            h.forEach(d => {
                d.pattern = true
                d.group = "global"
            })
            histG.set(c, h)
        })
    }

    onMounted(function() {
        readGlobal()
        read()
    })

    watch(() => app.dataset, readGlobal)

    watch(() => props.active, read)
    watch(() => props.time, read)
</script>