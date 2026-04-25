<template>
    <Teleport to="body">
        <v-sheet v-if="points.length > 0 && scales.x && scales.y"
            class="pa-1"
            rounded="sm"
            elevation="4"
            :style="{
                top: (y-5)+'px',
                right: (x+10)+'px',
                overflowY: 'auto',
                position: 'absolute',
                zIndex: zIndex
            }">
            <svg :width="size" :height="size" style="border: 1px solid lightgrey;">
                <circle v-for="a in points"
                    :cx="scales.x(a[scales.xAttr])"
                    :cy="scales.y(a[scales.yAttr])"
                    r="4"
                    :fill="scales.color(a[column])"
                    :stroke="color(scales.color(a[column])).darker(1)">
                </circle>
            </svg>
            <div class="mt-2 text-caption" style="text-align: center;">
                <div v-for="c in anno.columns" :style="{ fontWeight: c.name === column ? 'bold' : null }">
                    {{ c.name }}
                </div>
            </div>
        </v-sheet>
    </Teleport>
</template>

<script setup>
    import { color } from 'd3';
    import DM from '@/use/data-manager';
    import { onMounted, reactive, watch } from 'vue';

    const props = defineProps({
        anno: {
            type: Object,
            required: true
        },
        column: {
            type: String,
            required: true
        },
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        },
        zIndex: {
            type: Number,
            default: 2999
        },
        size: {
            type: Number,
            default: 300
        }
    })

    const scales = reactive({
        xAttr: "x",
        yAttr: "y",
        x: null,
        y: null,
        color: null
    })

    const points = ref([])

    function readColor() {
        scales.color = DM.scales[props.column]
    }

    function read() {
        readColor()
        scales.xAttr = DM.xAttr
        scales.yAttr = DM.yAttr
        scales.x = DM.x.copy().domain(DM.x.domain()).range([5, props.size-5])
        scales.y = DM.y.copy().domain(DM.y.domain()).range([props.size-5, 5])

        const ids = new Set(props.anno.ids)
        points.value = DM.data.filter(d => ids.has(d.id))
    }

    onMounted(read)

    watch(() => props.column, readColor)
    watch(() => props.anno.id, read)

</script>