<template>
    <Teleport to="body">
        <v-card v-if="showInventory" class="inv-panel" elevation="4">
            <v-card-title>
                <div style="position: relative;">
                    <span>Annotation Inventory</span>
                    <v-btn style="position: absolute; top: 5px; right: 0px" density="compact" @click="showInventory = false" color="error" icon="mdi-close" variant="plain"></v-btn>
                </div>
            </v-card-title>
            <v-card-text>
                <div class="mt-2">
                    <v-sheet v-for="i in items" :key="i.id" class="pa-2 d-flex justify-space-between" rounded elevation="2" style="width: 100%;">
                        <div>
                            <div><b>{{ i.stats.size }}</b> annotation(s)</div>
                            <div><b>{{ i.stats.data }}</b> data points</div>
                            <v-divider class="mt-2 mb-2"></v-divider>
                            <div>
                                <div>common labels</div>
                                <div v-for="c in i.stats.columns" class="ml-2 text-caption">{{ c }}</div>
                            </div>
                        </div>
                        <svg width="200" height="200" style="border: 1px solid lightgrey;">
                            <line v-for="l in i.links"
                                :x1="scales.x(l.coords[0][0])"
                                :x2="scales.x(l.coords[1][0])"
                                :y1="scales.y(l.coords[0][1])"
                                :y2="scales.y(l.coords[1][1])"
                                fill="none"
                                stroke="black"
                                stroke-width="2"
                                opacity="0.25">
                            </line>
                            <circle v-for="a in i.annotations"
                                :cx="scales.x(a[scales.xAttr])"
                                :cy="scales.x(a[scales.yAttr])"
                                r="5"
                                @pointerenter="e => showAnno(e, a)"
                                @pointerleave="hideAnno"
                                stroke="black"
                                :fill="a.color">
                            </circle>
                        </svg>
                    </v-sheet>
                </div>
            </v-card-text>
        </v-card>
        <v-btn v-else icon="mdi-safe-square-outline" density="comfortable" class="inv-button" variant="flat" color="primary" @click="showInventory = true"/>
    </Teleport>

    <AnnoTooltip v-if="hover.anno"
        :anno="hover.anno"
        :column="hover.column"
        :x="hover.x"
        :y="hover.y"/>
</template>

<script setup>
    import { pointer } from 'd3';
    import { useApp } from '@/stores/app';
    import DM from '@/use/data-manager';
    import INV from '@/use/inventory';
    import { storeToRefs } from 'pinia';
    import { ref, onMounted, watch, reactive } from 'vue';
    import AnnoTooltip from './AnnoTooltip.vue';

    const app = useApp()

    const { dataset, showInventory, inventoryTime } = storeToRefs(app)

    const items = ref([])

    const scales = reactive({
        xAttr: "x",
        yAttr: "y",
        x: null,
        y: null,
    })

    const hover = reactive({
        anno: null,
        x: 0,
        y: 0
    })

    function showAnno(event, annotation, column=null) {
        const [mx, my] = pointer(event, document.body)
        hover.x = window.innerWidth - mx
        hover.y = my;
        hover.column = column ? column : annotation.columns[0].name
        hover.anno = annotation
    }

    function hideAnno() {
        hover.anno = null
    }

    function read() {
        scales.xAttr = DM.xAttr
        scales.yAttr = DM.yAttr
        scales.x = DM.x.copy().domain(DM.x.range()).range([5, 195])
        scales.y = DM.y.copy().domain(DM.y.range()).range([195, 5])
        items.value = INV.getData(dataset.value)
    }

    onMounted(read)

    watch(dataset, read)
    watch(inventoryTime, read)
</script>

<style scoped>
.inv-button {
    position: absolute;
    top: 10px;
    right: 15px;
}

.inv-panel {
    position: fixed;
    width: 30vw;
    max-width: 30vw;
    min-height: 95vh;
    top: 25px;
    right: 15px;
    z-index: 1999;
}
</style>