<template>
<div style="min-height: 90vh; max-height: 97vh; max-width: 100vw;">

    <div v-if="ready" class="d-flex flex-column align-center justify-start mt-2">

        <div :style="{ width: (w+800)+'px' }" style="min-height: 200px;">
            <DataHistograms
                :active="!moveLens || mouseStill"
                :time="lensTime"
                :refresh="featureTime"
                :mode="refMode"
                :selected-column="chosenColorAttr"
                @update="applyLens"/>
        </div>

        <div class="d-flex">
            <div>
                <div class="d-flex justify-space-between align-center ml-2 mr-2">
                    <div>
                        <div class="d-flex text-caption">
                            <div class="d-flex align-center">
                                <v-btn size="sm" rounded="sm" density="compact" icon="mdi-magnify" variant="text" @click="editColor = true"/>
                                <div class="ml-1 mr-1">
                                    {{ chosenColorAttr }}
                                    <span v-if="colorOverride">(override)</span>
                                    <span v-else-if="!int.fromLens">(default)</span>
                                </div>
                                <v-btn v-if="colorOverride" size="sm" rounded="sm" density="compact" icon="mdi-delete" color="error" variant="text" @click="app.setColorOverride('')"/>
                            </div>
                            <v-divider v-if="int.filterAttr !== null" vertical class="ml-2 mr-2"></v-divider>
                            <FilterDesc v-if="int.filterAttr !== null"
                                :data="int.filterValues"
                                :name="int.filterAttr"
                                @clear="setFilter(null)"
                                :ordinal="int.filterType === DATA_TYPES.ORDINAL || int.filterType === DATA_TYPES.NOMINAL || int.filterType === DATA_TYPES.BOOLEAN"
                                :scale="app.scales[int.filterAttr]"/>
                        </div>

                        <ColorLegend v-if="app.scales[chosenColorAttr]"
                            :key="chosenColorAttr"
                            :scale="app.scales[chosenColorAttr]"
                            :selected="chosenColorAttr === int.filterAttr ? int.filterValues : []"
                            style="display: block;"
                            :refresh="lensTime"
                            @click="setFilter"
                            @brush="setFilter"/>
                    </div>

                    <div>
                        <ColorLegend v-if="ready"
                            :key="'cf_'+lensType"
                            :tick-format="featureScaleTicks"
                            :tick-values="[0, 1]"
                            :num-ticks="2"
                            style="display: block;"
                            class="mt-5"
                            :scale="featureScale"/>

                        <div v-else style="width: 200px; text-align: center;" class="mt-5">
                            <v-progress-circular indeterminate size="30"></v-progress-circular>
                        </div>
                    </div>
                </div>

                <div style="position: relative;">
                    <FeatureMap
                        :column="chosenColorAttr"
                        :hide="int.filterAttr!==null"
                        :mode="refMode"
                        :lens-type="lensType"
                        :time="featureTime"
                        style="margin: 0px 170px;"
                        :width="w"
                        :height="h"/>

                    <ScatterPlot
                        ref="scatter"
                        id="scatter-main"
                        style="position: absolute; top: 0; left: 0; margin: 0px 170px;"
                        :time="dataTime"
                        :update="lensTime"
                        :x-attr="datasetX"
                        :y-attr="datasetY"
                        :color-attr="chosenColorAttr"
                        :color-scale="app.scales[chosenColorAttr]"
                        :radius="5"
                        :width="w"
                        :height="h"
                        show-lens
                        :fixed-lens="!moveLens"
                        :highlight-color="theme.current.value.colors.primary"
                        @click-lens="onClickLens"
                        @hover="onHover"/>
                </div>
            </div>

            <div class="ml-4" style="min-width: 525px; max-width: 525px;">

                <ActiveAnnotationView style="min-height: 30vh; max-height: 30vh; overflow-y: auto;"/>

                <div class="d-flex justify-center mt-4">
                    <LLMChatPanel v-if="app.useChat" max-height="30vh"/>
                </div>
            </div>
        </div>

        <AnnotationOverlay
            target-id="scatter-main"
            :selected="chosenColorAttr"
            @select-color="col => app.setColorOverride(col)"
            :time="annoTime"
            :active="!moveLens"/>

        <LensOverlay
            target="scatter-main"
            :time="lensTime"
            :radius="lensRadius-10"
            :mode="refMode"
            :index-primary="colorIndex"
            :index-secondary="colorIndexSec"
            :active-lens="activeLens"
            @click-lens="onClickLensOverlay"
            @click-mini="onClickMini"
            @click-label="onClickLabel"
            :indices="[0]"/>

        <ColorPicker v-model="editColor" @select="col => app.setColorOverride(col)"/>
    </div>
</div>
</template>

<script setup>
    import * as d3 from 'd3'
    import ScatterPlot from './vis/ScatterPlot.vue'
    import { storeToRefs } from 'pinia'
    import { useApp } from '@/stores/app';
    import { DATA_TYPES, useData } from '@/stores/data';
    import { useControls } from '@/stores/controls';
    import { LENS_TYPE } from '@/use/Lens';
    import { computed, reactive, useTemplateRef, watch } from 'vue';
    import DM from '@/use/data-manager';
    import ColorLegend from './vis/ColorLegend.vue';
    import FilterDesc from './FilterDesc.vue';
    import { findInCircle, getAttr, makeColorScale, parseEntities } from '@/use/util';
    import FeatureMap from './vis/FeatureMap.vue';
    import { useTheme } from 'vuetify';
    import AnnotationOverlay from './annotation/AnnotationOverlay.vue';
    import LensOverlay from './LensOverlay.vue';
    import { useWindowSize } from '@vueuse/core';
    import { useTooltip } from '@/stores/tooltip';
    import ColorPicker from './ColorPicker.vue';
    import {
        COMBINE_PROMPT,
        COMPARE_PROMPT,
        DESCRIPTION_PROMPT,
        EXTRACT_PROMPT,
        REFINE_PROMPT,
        llmCombine,
        llmCompare,
        llmExtract,
        llmDescribe,
        llmFreeTargets,
        EXPLAIN_PROMPT
    } from '@/use/apis/llm-api';
    import { toast } from 'vue3-toastify';
    import DataHistograms from './DataHistograms.vue';
    import ActiveAnnotationView from './annotation/ActiveAnnotationView.vue';
    import { AnnotationEntryEntity } from '@/use/annotation/entity';
    import { ENTRY_SOURCE } from '@/use/annotation/annotation-entry';
    import { ACTION_TARGET } from '@/use/annotation/action-target';
    import { Command, LLMCommand } from '@/use/commands';
    import CM from '@/use/command-manager';
    import { MODIFIER_TYPE } from '@/use/annotation/modifiers';
    import LLMChatPanel from './LLMChatPanel.vue';

    const app = useApp()
    const dstore = useData()
    const controls = useControls()
    const tt = useTooltip()
    const theme = useTheme()

    const {
        ready,

        refMode,
        lensType,

        activeLens,
        colorOverride,
        colorIndex,
        colorIndexSec,
        columnIndex,

        moveLens,

        annoTime,
        featureTime,
        dataTime,
        lensTime,
        lensMoveTime

    } = storeToRefs(app)

    const {
        datasetId,
        datasetX,
        datasetY,
        datasetColor
    } = storeToRefs(dstore)

    const scatter = useTemplateRef("scatter")

    const editColor = ref(null)

    const wSize = useWindowSize()
    const w = computed(() => {
        const ww = wSize.width.value
        const wh = wSize.height.value
        return Math.max(500, Math.floor(Math.min(ww*0.7-550, wh*0.675)))
    })
    const h = computed(() => w.value)

    // const data = ref([])
    // const dataF = computed(() => {
    //     if (int.filterAttr === null) return []
    //     if (int.filterType === DATA_TYPES.ORDINAL || DATA_TYPES.NOMINAL || int.filterType === DATA_TYPES.BOOLEAN) {
    //         const v = int.filterValues
    //         return data.value
    //             .filter(d => v.includes(getAttr(d, int.filterAttr)))
    //             .map(d => d.id)
    //     }
    //     const [a, b] = int.filterValues
    //     return data.value
    //         .filter(d => getAttr(d, int.filterAttr) >= a && getAttr(d, int.filterAttr) <= b)
    //         .map(d => d.id)
    // })

    const columns = ref([])
    const ctypes = ref([])
    const topFeatures = ref([])

    const int = reactive({
        scales: {},
        columns: [],
        fromLens: false,

        filterAttr: null,
        filterValues: null,
        filterType: null,
    })

    const numData = ref(0)

    const colorColumn = ref(datasetColor.value)
    const colorColumnSec = ref(datasetColor.value)

    const colorType = computed(() => {
        const idx = columns.value.indexOf(chosenColorAttr.value)
        return idx >= 0 ? ctypes.value[idx] : null
    })

    const chosenColorAttr = computed(() => {
        if (colorOverride.value.length > 0) {
            return colorOverride.value
        }
        if (int.fromLens) {
            return colorColumn.value
        }

        return datasetColor.value
    })

    const primaryLens = ref(0)
    const secondaryLens = ref(1)

    const lensRadius = ref(50)

    const featureScale = computed(() => {
        if (lensType.value === LENS_TYPE.FREQUENT) {
            return d3.scaleSequential(t => d3.interpolateGreys(1-t))
        }
        return d3.scaleSequential(d3.interpolateGreys)
    })
    const featureScaleTicks = computed(() => {
        if (lensType.value === LENS_TYPE.FREQUENT) {
            return d => d < 1 ? "less frequent" : "more frequent"
        }
        return d => d < 1 ? "less relevant" : "more relevant"
    })

    const mouseStill = ref(false)

    let windowResize = null, plotResize = null, mouseMove = null, sizeTime = null
    let loop, looptime;

    ////////////////////////////////////////////////////////////////////////////
    /// Functions
    ////////////////////////////////////////////////////////////////////////////

    function setActiveLens(i) {
        if (i !== activeLens.value && i === primaryLens.value || i === secondaryLens.value) {
            activeLens.value = i
            setColorIndex(colorIndex.value)
        }
    }

    function setColorIndex(i) {
        const lens = DM.getLens(activeLens.value)
        i = Math.max(0, Math.min(i, lens.numResults[refMode.value]))
        if (activeLens.value === 0) {
            colorIndex.value = i
            colorColumn.value = lens.getResultColumn(refMode.value, i)
        } else {
            colorIndexSec.value = i;
            colorColumnSec.value = lens.getResultColumn(refMode.value, i)
        }
    }
    function setRefMode(mode="local") {
        const m = mode === "local" || mode === "global" ? mode : "local"
        if (m !== refMode.value) {
            // saveHistory()
            topFeatures.value = DM.getBestFeatures(lensType.value, m)
            app.setColor(topFeatures.value[0])
            refMode.value = m
        }
    }

    function setFilter(values) {
        if (values !== null) {
            const attr = chosenColorAttr.value
            int.filterType = colorType.value
            switch(int.filterType) {
                case DATA_TYPES.BOOLEAN:
                case DATA_TYPES.NOMINAL:
                case DATA_TYPES.ORDINAL:
                    if (int.filterAttr !== attr) {
                        int.filterAttr = attr
                        int.filterValues = [values]
                    } else  {
                        const idx = int.filterValues.indexOf(values)
                        if (idx >= 0) {
                            if (int.filterValues.length === 1) {
                                int.filterValues = null
                            } else {
                                int.filterValues.splice(idx, 1)
                            }
                        } else {
                            int.filterValues.push(values)
                        }
                        int.filterAttr = int.filterValues !== null ? attr : null
                    }
                    break;
                case DATA_TYPES.SEQUENTIAL:
                    if (int.filterAttr !== attr) {
                        int.filterAttr = attr
                        int.filterValues = values
                    } else  {
                        int.filterValues = int.filterValues[0] === values[0] && int.filterValues[1] === values[1] ? null : values
                        int.filterAttr = int.filterValues !== null ? attr : null
                    }
                    break;
            }
        } else {
            int.filterValues = null
            int.filterAttr = null
            int.filterType = null
        }

        // DM.computeFilterStats(dataF.value)
        applyLens()
    }

    function applyLens() {
        if (DM.lenses.length === 0) return

        int.fromLens = DM.getLensResults(primaryLens.value, refMode.value).length > 0

        if (int.fromLens) {
            const lens = DM.getLens(primaryLens.value)

            const results = lens.getResult(refMode.value)
            if (columnIndex.value >= results.length) {
                if (activeLens.value === 0) {
                    colorIndex.value = 0
                } else {
                    colorIndexSec.value = 0
                }
            }

            if (activeLens.value === 0) {
                colorColumn.value = lens.getResultColumn(refMode.value, colorIndex.value)
            }
        } else {
            colorColumn.value = datasetColor.value
            colorColumnSec.value = datasetColor.value
            DM.clearLens(secondaryLens.value)
        }

        app.updateLensData()
    }

    function updateLens(lx, ly, resetOnChange=true) {

        const lens = DM.getLens(activeLens.value)
        if (!lens) return

        const points = findInCircle(DM.tree, lx, ly, lens.radius)

        const pointIds = new Set(points.map(d => d.id))
        const changes = lens.ids.union(pointIds).size !== pointIds.size

        if (resetOnChange && changes) {
            if (activeLens.value === 0) {
                colorIndex.value = 0;
            } else {
                colorIndexSec.value = 0;
            }
        }

        DM.updateLens(activeLens.value, lx, ly, lensRadius.value, points)

        if (activeLens.value === primaryLens.value && scatter.value) {
            const sugg = DM.getMatchingLenses(
                lens.x, lens.y, lens.radius,
                activeLens.value, refMode.value,
                colorIndex.value
            )

            if (sugg.length === 0) {
                DM.clearLens(secondaryLens.value)
            } else {
                const suggPoints = findInCircle(DM.tree, sugg[0][0], sugg[0][1], lens.radius)
                DM.updateLens(secondaryLens.value, sugg[0][0], sugg[0][1], lens.radius, suggPoints)
            }
        }
    }

    function onHover(lx, ly, points, event) {
        if (moveLens.value) {
            mouseStill.value = false
            mouseMove = performance.now()
            updateLens(lx, ly)
            applyLens()
        } else if (dstore.dataset.meta) {
            // show tooltip with meta info
            if (points.length === 0) {
                tt.hide()
            } else {
                const [mx, my] = event ? d3.pointer(event, document.body) : [lx, ly]
                const meta = dstore.dataset.meta
                const str = points.map(d => `<div>${meta.map(m => getAttr(d, m)).join(", ")}</div>`).join("\n")
                tt.show(str, mx, my)
            }
        }
    }
    function onClickLens(lx, ly, id) {
        const act = DM.getLens(activeLens.value)
        if (act.id !== id) {
            setActiveLens(DM.getLensIndex(id))
            moveLens.value = true
        } else {
            moveLens.value = !moveLens.value
        }
        updateLens(lx, ly)
        applyLens()

        lensMoveTime.value = Date.now()
    }
    function onClickLensOverlay(id) {
        const act = DM.getLens(activeLens.value)
        if (act.id !== id) {
            setActiveLens(DM.getLensIndex(id))
            moveLens.value = true
        } else {
            moveLens.value = !moveLens.value
        }
        updateLens(act.x, act.y)
        applyLens()
        lensMoveTime.value = Date.now()
    }
    function onClickMini(lensIndex, columnIndex) {
        const lens = DM.getLens(lensIndex)
        if (lensIndex === primaryLens.value) {
            colorIndex.value = columnIndex
            colorColumn.value = lens.getResultColumn(refMode.value, columnIndex)
        } else {
            colorIndexSec.value = columnIndex;
            colorColumnSec.value = lens.getResultColumn(refMode.value, columnIndex)
        }
        app.updateLensData()
    }

    function onClickLabel(lensIndex, columnIndex) {
        // TODO: what to do here?
    }

    async function init() {
        ready.value = false
        mouseStill.value = false

        topFeatures.value = []
        int.mainLens = null
        int.columns = []
        int.otherColumns = []
        int.fromLens = false
        colorIndex.value = 0
        colorIndexSec.value = 0
        colorColumn.value = app.datasetColor
        colorColumnSec.value = app.datasetColor
        activeLens.value = primaryLens.value
        moveLens.value = false

        DM.setSize(w.value, h.value)

        // add primary lens
        if (DM.lenses.length === 0) {
            DM.addLens(lensRadius.value, lensType.value, true)
        }

        const scales = {}
        DM.columns.forEach((c, i) => {
            scales[c] = makeColorScale(
                DM.data,
                c,
                DM.types[i],
                theme.current.value.colors.primary
            )
        })
        DM.setScales(scales)

        app.scales = scales
        ctypes.value = DM.types.slice()

        dataTime.value = Date.now()
        annoTime.value = Date.now()

        updateLens(lensRadius.value, lensRadius.value, false)
        applyLens()

        refreshFeatureMaps()
    }

    function refreshFeatureMaps() {
        ready.value = false
        DM.computeFeatureMaps(lensRadius.value, 10, () => {
            topFeatures.value = DM.getBestFeatures(lensType.value, refMode.value)
            ready.value = true
            const lens = DM.getLens(0)
            updateLens(lens.x, lens.y)
            applyLens()
            featureTime.value = Date.now()
        })
    }

    function loopFunc(timestamp) {

        // react to last plot resize
        const plotDiff = plotResize !== null ? timestamp - plotResize : 0
        if (plotDiff >= 200 && plotDiff <= 250) {
            plotResize = null
            DM.resize(w.value, h.value)
            refreshFeatureMaps()
        }

        // react to last window resize
        const resizeDiff = windowResize !== null ? timestamp - windowResize : 0
        if (resizeDiff >= 200 && resizeDiff <= 250) {
            windowResize = null
            // applyLens()
            app.updateLensData()
        }

        // react to mouse down for longer time
        const mouseDiff = mouseMove !== null ? timestamp - mouseMove : 0
        if (mouseDiff >= 100 && mouseDiff <= 150) {
            mouseMove = null
            mouseStill.value = true
        }

        // react to lens resize after some time (more expensive stuff)
        const sizeDiff = sizeTime !== null ? timestamp - sizeTime : 0
        if (sizeDiff >= 50 && sizeDiff <= 150) {
            sizeTime = null
            refreshFeatureMaps()
        }

        // keep going
        loop = requestAnimationFrame(loopFunc)
    }

    onMounted(function() {
        // static hotkeys
        CM.addKeyMappingLocked(0, "a", "prev col", new Command(function() {
            if (columnIndex.value > 0) {
                setColorIndex(columnIndex.value - 1)
                applyLens()
            }
        }))
        CM.addKeyMappingLocked(1, "d", "next col", new Command(function() {
            setColorIndex(columnIndex.value + 1)
            applyLens()
        }))

        CM.addKeyMappingLocked(2, "s", "select", new Command(function() {
            // TODO: add lens to saved selection
            // DM.addLensToSelection()
            console.log("hotkey select")
        }))

        CM.addKeyMappingLocked(3, "z", "undo", new Command(function() {
            // TODO: undo action
            console.log("hotkey undo")
        }), ["ctrl"])

        CM.addKeyMappingLocked(4, "y", "redo", new Command(function() {
            // TODO: redo action
            console.log("hotkey redo")
        }), ["ctrl"])

        // llm hotkeys
        const descCommand = new LLMCommand(async function(prompt, target) {
            app.setLLMLoading(true)

            switch (target.type) {
                case ACTION_TARGET.SELECTION:
                    await DM.syncSelections()
                    // get selection/group ids
                    const ids = target.getSelectionIds()
                    if (ids.length === 0) {
                        toast.error("no entity to describe")
                        return
                    }
                    console.log(target, ids)
                    // ask for description and label
                    const response = await llmDescribe(prompt, ids, "group")
                    const entities = parseEntities(response)
                    const entry = DM.annotateText(
                        response.answer,
                        ENTRY_SOURCE.AI,
                        entities,
                        { id: target.annotation?.id }
                    )
                    entry._anno.setTitle(response.label)
                    app.setLLMLoading(false)
                    break
                case ACTION_TARGET.VIS:
                    // TODO: add the response text to the global notes
                    console.debug("describe vis")
                    break
            }}, DESCRIPTION_PROMPT, 1, 1, [ACTION_TARGET.SELECTION, ACTION_TARGET.VIS])
        // add hotkey for "describe" command
        CM.addKeyMapping(5, "1", "describe", descCommand)


        const extractCommand = new LLMCommand(async function(prompt, target) {
            app.setLLMLoading(true)
            await DM.syncSelections()

            // get selection/group ids
            const ids = target.getSelectionIds()
            if (ids.length === 0) {
                toast.error("no data to extract columns for")
                return
            }

            const response = await llmExtract(prompt, ids, "group")
            const entities = parseEntities(response)
            DM.annotateText(
                response.answer,
                ENTRY_SOURCE.AI,
                entities,
                { id: target.annotation?.id }
            )
            app.setLLMLoading(false)

        }, EXTRACT_PROMPT, 1, 1, [ACTION_TARGET.SELECTION])
        // add hotkey for "extract" command
        CM.addKeyMapping(6, "3", "extract", extractCommand)

        const compareCommand = new LLMCommand(async function(prompt, targets) {
            app.setLLMLoading(true)
            await DM.syncSelections()

            // get data for all involved selections
            const groups = targets.map(t => t.getSelectionIds())

            if (groups.length < 2) {
                toast.error("not enough data for a comparison")
                return
            }

            const response = await llmCompare(prompt, groups, "group")
            const entities = parseEntities(response)
            targets.forEach(t => {
                if (t.annotation) {
                    entities.push(new AnnotationEntryEntity(
                        t.annotation.id,
                        t.annotation.label,
                        t.annotation
                    ))
                }
                // should we also add selection entities?
            })
            DM.annotateText(
                response.answer,
                ENTRY_SOURCE.AI,
                entities,
                { useGlobal: true }
            )
            app.setLLMLoading(false)
        }, COMPARE_PROMPT, 2, Infinity, [ACTION_TARGET.SELECTION])
        CM.addKeyMapping(7, "4", "compare", compareCommand)

        const combineCommand = new LLMCommand(async function(prompt, targets) {
            app.setLLMLoading(true)
            await DM.syncSelections()

            const response = await llmCombine(prompt, targets.map(t => t.getIds()).flat())
            const entities = parseEntities(response)
            // TODO: add to a global notepad
            DM.annotateModifier(
                response.answer,
                ENTRY_SOURCE.AI,
                entities,
                { useGlobal: true }
            )
            app.setLLMLoading(false)
            app.setColorOverride(MODIFIER_TYPE.COLOR_FUNCTION)
        }, COMBINE_PROMPT, 2, Infinity, [ACTION_TARGET.COLUMN])
        CM.addKeyMapping(8, "5", "combine", combineCommand)


        const refineCmd = new LLMCommand(async function(prompt, target) {
            app.setLLMLoading(true)
            await DM.syncSelections()

            const entry = target.annotation.getEntry(target.getEntities().id)
            const response = await llmFreeTargets(prompt, entry.id, "anno_entry")
            entry.setText(response.answer)
            app.setLLMLoading(false)
        }, REFINE_PROMPT, 1, 1, [ACTION_TARGET.ANNOTATION])
        // add hotkey for "refine" command
        CM.addKeyMapping(9, "6", "refine", refineCmd)


        const explainCmd = new LLMCommand(async function(prompt, target) {
            app.setLLMLoading(true)
            await DM.syncSelections()

            const entry = target.annotation.getEntry(target.getEntities().id)
            const response = await llmFreeTargets(prompt, entry.id, "anno_entry")
            const entities = parseEntities(response)
            DM.annotateText(
                response.answer,
                ENTRY_SOURCE.AI,
                entities,
                { id: target.annotation?.id }
            )
            app.setLLMLoading(false)
        }, EXPLAIN_PROMPT, 1, 1, [ACTION_TARGET.ANNOTATION])
        // add hotkey for "explain" command
        CM.addKeyMapping(10, "7", "explain", explainCmd)


        // resize lens
        window.addEventListener("wheel", function(event) {
            if (!event.shiftKey) return
            const [mx, my] = d3.pointer(event, document.body)
            const elem = document.elementFromPoint(mx, my)
            if (!elem || !elem.classList.contains("lens") && !elem.classList.contains("lens-circle")) return
            lensRadius.value = Math.max(
                5,
                Math.min(
                    Math.max(w.value, h.value),
                    Math.round(lensRadius.value + event.deltaY * -0.05)
                )
            )
            DM.getLens(0).radius = lensRadius.value
            sizeTime = performance.now()
            return false
        })

        // update lens data when something changes
        DM.onLens(() => {
            app.updateLensData()
            lensMoveTime.value = Date.now()
        })
        // propagate annotation changes
        DM.onAnnotation(() => annoTime.value = Date.now())

        looptime = Date.now()
        loop = requestAnimationFrame(loopFunc)

        controls.setInitialized()

        init()
    })

    watch(datasetId, init)
    watch(colorOverride, applyLens)

    watch(() => ([w.value, h.value]), () => plotResize = performance.now())
    watch(() => ([wSize.width.value, wSize.height.value]), () => windowResize = performance.now())
</script>