<template>
    <div class="d-flex align-center">
        <v-btn
            icon="mdi-menu-left"
            variant="tonal"
            rounded="sm"
            :height="height+30"
            :disabled="index === 0"
            class="mr-1"
            @click="emit('go-left')" density="compact"></v-btn>
        <div class="d-flex align-center">
            <v-card v-for="data in derived" class="mr-1" density="compact" :style="{ border: '2px solid ' + (selected === data.columnName ? 'black' : 'white')}">
                <div v-if="disabled || !data.columnName" :style="{ width: width+'px', height: (height+27)+'px' }" class="d-flex align-center justify-center">
                    <v-icon size="50">mdi-cancel</v-icon>
                </div>
                <div v-else>
                    <div style="text-align: center; vertical-align: middle;" :style="{ maxWidth: width+'px' }" class="text-caption text-dots">
                        <span style="font-size: 9px;">({{ data.columnValue.toFixed(2) }})</span> {{ data.columnName }}
                    </div>
                    <BarChart
                        :data="data.values"
                        x-attr="x"
                        y-attr="y"
                        color-attr="color"
                        :y-domain="data.domain"
                        :width="width"
                        :height="height" />
                </div>
            </v-card>
        </div>
        <v-btn
            icon="mdi-menu-right"
            variant="tonal"
            rounded="sm"
            :height="height+30"
            class="ml-1"
            @click="emit('go-right')" density="compact"></v-btn>
    </div>
</template>

<script setup>
    import * as d3 from 'd3'
    import { onMounted, watch } from 'vue';
    import BarChart from './vis/BarChart.vue';
    import DM from '@/use/data-manager';

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
        selected: {
            type: String,
            default: ""
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

    const emit = defineEmits(["go-left", "go-right"])

    const derived = ref([])

    function getColumnIndices(lens) {
        if (props.index <= 0) {
            return d3.range(0, Math.min(props.size, lens.numResults[props.mode]))
        }
        return d3.range(props.index-1, Math.min(props.index+props.size-1, lens.numResults[props.mode]))
    }

    function init() {

        if (!DM.hasLens(props.lens) || !DM.hasLensResult(props.lens, props.mode)) return

        const lens = DM.getLens(props.lens)
        const indices = getColumnIndices(lens)
        const columns = indices.map(i => lens.getResultColumn(props.mode, i))
        if (columns.some(c => !DM.filterStats[c])) return

        // store results here
        const results = []
        // data to calculate things from
        const data = lens.getResultData()

        columns.forEach((c, i) => {
            const idx = DM.columns.indexOf(c)

            results.push({
                index: indices[i],
                columnName: c,
                columnValue: lens.getResultValue(props.mode, i),
                values: lens.getResultHist(props.mode, i),
                domain: [0, 1]
            })
        })

        derived.value = results
    }

    onMounted(init)

    watch(props, init, { deep: true })
</script>