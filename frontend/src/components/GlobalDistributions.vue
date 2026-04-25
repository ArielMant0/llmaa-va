<template>
    <div class="d-flex align-center justify-space-between">
        <v-card v-for="data in derived" class="mr-1" :key="data.columnName" density="compact" :style="{ border: '2px solid white' }">
            <div v-if="disabled" :style="{ width: width+'px', height: (height+27)+'px' }" class="d-flex align-center justify-center">
                <v-icon size="50">mdi-cancel</v-icon>
            </div>
            <div v-else>
                <div style="text-align: center; vertical-align: middle;" :style="{ maxWidth: width+'px' }" class="text-caption text-dots">
                    {{ data.columnName }}
                </div>
                <BarChart
                    :data="data.values"
                    x-attr="x"
                    y-attr="y"
                    :y-domain="data.domain"
                    color-attr="color"
                    :width="width"
                    :height="height" />
            </div>
        </v-card>
    </div>
</template>

<script setup>
    import { onMounted, watch } from 'vue';
    import BarChart from './vis/BarChart.vue';
    import { DATA_TYPES } from '@/stores/data';
    import DM from '@/use/data-manager';
    import { max, range } from 'd3';

    const props = defineProps({
        lens: {
            type: Number,
            required: true
        },
        mode: {
            type: String,
            required: true
        },
        time: {
            type: Number,
            required: true
        },
        index: {
            type: Number,
            default: 0
        },
        size: {
            type: Number,
            default: 3
        },
        width: {
            type: Number,
            default: 200
        },
        height: {
            type: Number,
            default: 100
        },
        disabled: {
            type: Boolean,
            default: false
        }
    })

    const derived = ref([])

    function getColumnIndices(lens) {
        if (props.index <= 0) {
            return range(0, Math.min(props.size, lens.numResults[props.mode]))
        }
        return range(props.index-1, Math.min(props.index+props.size-1, lens.numResults[props.mode]))
    }

    function init() {
        if (!DM.hasLens(props.lens) || !DM.hasLensResult(props.lens, props.mode)) return

        const lens = DM.getLens(props.lens)
        const columns = getColumnIndices(lens).map(i => lens.getResultColumn(props.mode, i))
        if (columns.some(c => !DM.filterStats[c])) return

        const results = []

        columns.forEach(c => {
            const idx = DM.columns.indexOf(c)
            const type = DM.types[idx]
            const scale = DM.scales[c]

            switch(type) {
                case DATA_TYPES.BOOLEAN:
                    const list = []
                    DM.filterStats[c].bins.map(value => {
                        const y = value === true ? DM.filterStats[c].countRel : 1 - DM.filterStats[c].countRel
                        list.push({ x: value, y: y, color: scale(value) })
                    })
                    results.push({ columnName: c, values: list, domain: [0, 1] })
                    break;
                case DATA_TYPES.NOMINAL:
                case DATA_TYPES.ORDINAL: {
                    const list = []
                    DM.filterStats[c].bins.map(name => {
                        list.push({ x: name, y: DM.filterStats[c].count[name], color: scale(name) })
                    })
                    list.sort((a, b) => a.x - b.x)
                    results.push({ columnName: c, values: list, domain: [0, max(list, d => d.y)] })
                } break
                default:
                case DATA_TYPES.SEQUENTIAL: {
                    const list = []
                    DM.filterStats[c].bins.forEach((b, i) => {
                        list.push({ x: b, y: DM.filterStats[c].count[i], color: scale(b) })
                    })
                    results.push({ columnName: c, values: list, domain: [0, max(list, d => d.y)] })
                }

            }
        })

        derived.value = results
    }

    onMounted(init)

    watch(props, init, { deep: true })
</script>