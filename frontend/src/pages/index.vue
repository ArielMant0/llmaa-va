<template>
    <div style="height: 100vh;" class="pa-2">
        <v-overlay v-if="!loaded" absolute>
            <v-progress-circular size="64" indeterminate></v-progress-circular>
        </v-overlay>

        <template v-if="loaded">
            <SystemView/>
            <GlobalSettings/>
            <HotBar v-if="!useChat"/>
        </template>

        <HoverOverlay/>
        <TargetingOverlay/>
        <CommandEditingPanel/>
    </div>
</template>

<script setup>
    import TargetingOverlay from '@/components/TargetingOverlay.vue';
    import SystemView from '@/components/SystemView.vue';
    import { useApp } from '@/stores/app';
    import { useControls } from '@/stores/controls';
    import { storeToRefs } from 'pinia';
    import { onMounted, watch } from 'vue';
    import HotBar from '@/components/HotBar.vue';
    import GlobalSettings from '@/components/GlobalSettings.vue';
    import CommandEditingPanel from '@/components/CommandEditingPanel.vue';
    import HoverOverlay from '@/components/HoverOverlay.vue';
    import { getData } from '@/use/apis/data-api';
    import { convertDType, DATA_TYPES, useData } from '@/stores/data';
    import DM from '@/use/data-manager';
    import { MODIFIER_COLUMNS } from '@/use/annotation/modifiers';

    const app = useApp()
    const dstore = useData()
    const controls = useControls()

    const { useChat } = storeToRefs(app)
    const { loaded, datasetId } = storeToRefs(dstore)

    async function init() {
        // get available datasets
        try {
            const ds = await getData("datasets")
            dstore.setDatasets(ds)
        } catch(e) {
            console.error(e.toString())
        }
    }

    async function loadDataset() {
        if (!dstore.dataset) {
            return console.warn("tried to load dataset without id")
        }

        dstore.setLoaded(false)

        const dsid = dstore.datasetId
        // get columns, items groups, and annotations
        const [columns, items] = await Promise.all([
            getData("columns", dsid),
            getData("items", dsid),
        ])

        columns.forEach(c => c.dtype = convertDType(c.dtype))

        const useColumns = columns.filter(d => {
            const n = d.name.toLowerCase()
            return n !== "id" &&
                n !== dstore.datasetX &&
                n !== dstore.datasetY &&
                !dstore.dataset.ignore.includes(n)
        }).concat(MODIFIER_COLUMNS.map(name => ({ id: -1, name: name, dtype: DATA_TYPES.SEQUENTIAL })))

        DM.setColumns(columns, useColumns, false)

        items.forEach(d => MODIFIER_COLUMNS.forEach(name => d[name] = 0))
        DM.setData(items, dstore.datasetX, dstore.datasetY, false)

        const [groups, annotations] = await Promise.all([
            getData("groups", dsid),
            getData("annotations", dsid)
        ])

        DM.setAnnotations(annotations, false)

        dstore.setLoaded(true)
    }

    onMounted(function() {
        window.addEventListener("keydown", (event) => controls.keyEvent(event))
        init()
    })

    watch(datasetId, loadDataset)

</script>

