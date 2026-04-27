<template>

    <v-sheet rounded elevation="2" min-height="100" style="width: 100%;">

        <v-tabs v-model="tab" color="primary" density="compact">
            <v-tab value="active">
                <v-badge v-if="showActiveBadge" location="top right" :offset-x="-8" color="error" dot>
                    Active
                </v-badge>
                <span v-else>Active</span>
            </v-tab>
            <v-tab value="global">
                <v-badge v-if="showGlobalBadge" location="top right" :offset-x="-8" color="error" dot>
                    Global
                </v-badge>
                <span v-else>Global</span>
            </v-tab>
        </v-tabs>

        <v-divider></v-divider>

        <v-tabs-window v-model="tab" class="pa-1">

            <v-tabs-window-item value="active">
                <AnnotationPanel v-for="anno in annos"
                    :key="anno.id+'_'+anno.timeUpdated"
                    :data="anno"
                    width="100%"
                    />

                <TextNote v-if="annos.length === 0" class="mt-2 mr-1 ml-1"/>
            </v-tabs-window-item>

            <v-tabs-window-item value="global">
                <AnnotationPanel v-if="global"
                    :key="global.id+'_'+global.timeUpdated"
                    :data="global"
                    width="100%"
                    />
            </v-tabs-window-item>


            <div v-if="llmLoading" class=" mt-4 d-flex align-center justify-center">
                <v-progress-circular size="32" indeterminate></v-progress-circular>
            </div>

        </v-tabs-window>




    </v-sheet>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import { storeToRefs } from 'pinia';
    import { computed, onMounted, ref, watch } from 'vue';
    import AnnotationPanel from './AnnotationPanel.vue';
    import TextNote from './TextNote.vue';
    import { useAnnotations } from '@/use/use-annotations';

    const app = useApp()
    const { lensTime, annoTime, llmLoading, numSelections } = storeToRefs(app)

    const tab = ref("global")
    const annos = ref([])
    const global = ref(null)

    const lastActiveUpdate = ref(0)
    const lastActiveVisible = ref(0)
    const showActiveBadge = computed(() => lastActiveUpdate.value > lastActiveVisible.value)

    const globalTime = ref(0)
    const lastGlobalUpdate = ref(0)
    const lastGlobalVisible = ref(0)
    const showGlobalBadge = computed(() => lastGlobalUpdate.value > lastGlobalVisible.value)

    // read current annotations
    function readAnnotations() {
        const annots = useAnnotations()
        const before = new Set(annos.value.map(d => d.id))
        const tmp = annots.getMatching()
        if (tmp) {
            const after = new Set(tmp.map(d => d.id))
            if (before.size !== after.size || before.union(after).size !== before.size) {
                annos.value = tmp
                lastActiveUpdate.value = Date.now()
                switchTab("active")
            }
        } else {
            annos.value = []
        }

        if (!global.value) {
            global.value = annots.globalAnno
            lastGlobalUpdate.value = Date.now()
        }

        globalTime.value = global.value.timeUpdated
    }

    function checkTab() {
        switchTab(numSelections.value > 0 ? "active" : "global")
    }

    function switchTab(value) {
        if (tab.value !== value) {
            tab.value = value
        } else {
            updateVisible()
        }
    }

    function updateVisible() {
        if (tab.value === "active") {
            lastActiveVisible.value = Date.now()
        } else {
            lastGlobalVisible.value = Date.now()
        }
    }

    onMounted(function() {
        readAnnotations()
        updateVisible()
    })

    watch(numSelections, checkTab)
    watch(tab, updateVisible)
    watch(() => Math.max(lensTime.value, annoTime.value), readAnnotations)
    watch(globalTime, (value) => {
        lastGlobalUpdate.value = Date.now()
        switchTab("global")
    })
</script>