<template>
    <div class="d-flex align-center anno-container"
        @pointerenter="annoStore.addHoverAnno(anno.id)"
        @pointerleave="annoStore.removeHoverAnno(anno.id)"
        >

        <div v-if="side === 'left'" class="extras">
            <div>
                <v-btn
                    color="error"
                    variant="text"
                    rounded="sm"
                    size="sm"
                    icon="mdi-delete"
                    density="compact"
                    @click="DM.removeAnnotation(anno.id)"/>
            </div>

            <div>
                <MiniColorPicker v-model="anno.color"
                    :size="20"
                    @update:model-value="anno.update()"
                    />
            </div>
        </div>

        <div
            class="pa-1 mb-1"
            :style="{
                border: !styleSelected ? 'none' : (selected ? 2 : 1) + 'px solid black',
                borderRadius: '4px',
                opacity: !styleSelected || selected ? 1 : 0.75,
                overflowX: 'hidden',
                overflowY: 'auto',
                minHeight: minh,
                maxHeight: maxh,
                fontSize: '12px',
                minWidth: w,
                maxWidth: w,
            }">

            <AnnotationTitle
                v-model:title="anno.title"
                :label="anno.label"
                :color="anno.color"
                :size="anno.data.size"
                class="text-dots cursor-pointer"
                :data-target-type="ACTION_TARGET.SELECTION"
                :data-target-id="anno.id"
                :data-target-anno="anno.id"
                :data-target-selections="anno.getSelectionIds().join(',')"
                style="max-width: 95%;"
                />

            <template v-for="(entry, idx) in entries" :key="entry.id+'_'+entry.timeUpdated">
                <v-divider v-if="idx > 0" class="mt-2 mb-1"></v-divider>
                <AnnotationEntryPanel :data="entry" :max-length="maxEntryLength" :compact="showCompact"/>
            </template>
            <div v-if="numHidden > 0">{{ numHidden }} more...</div>

            <TextNote v-if="!hideInput" class="mt-1" :annotation-id="anno.id"/>
        </div>

        <div v-if="side === 'right'" class="extras">
            <div>
                <v-btn
                    color="error"
                    variant="text"
                    rounded="sm"
                    size="sm"
                    icon="mdi-delete"
                    density="compact"
                    @click="DM.removeAnnotation(anno.id)"/>
            </div>

            <div>
                <MiniColorPicker
                    v-model="anno.color"
                    :size="20"
                    @update:model-value="anno.update()"
                    />
            </div>
        </div>
    </div>
</template>

<script setup>
    import Annotation from '@/use/annotation/annotation';
    import DM from '@/use/data-manager';
    import AnnotationEntryPanel from './AnnotationEntryPanel.vue';
    import { computed } from 'vue';
    import { ACTION_TARGET } from '@/use/annotation/action-target';
    import AnnotationTitle from './AnnotationTitle.vue';
    import MiniColorPicker from '../MiniColorPicker.vue';
    import TextNote from './TextNote.vue';
    import { useAnno } from '@/stores/anno';

    const props = defineProps({
        data: {
            type: Annotation,
            required: false
        },
        id: {
            type: String,
            required: false
        },
        side: {
            type: String,
            default: ""
        },
        selected: {
            type: Boolean,
            default: false
        },
        styleSelected:{
            type: Boolean,
            default: false
        },
        hideInput: {
            type: Boolean,
            default: false
        },
        minHeight: {
            type: [String, Number],
            default: "auto"
        },
        maxHeight: {
            type: [String, Number],
            default: "auto"
        },
        width: {
            type: [String, Number],
            default: "100%"
        },
        maxEntryLength: {
            type: Number,
            default: 0
        }
    })

    const annoStore = useAnno()

    const minh = computed(() => props.minHeight + (typeof props.minHeight === "string" ? "" : "px"))
    const maxh = computed(() => props.maxHeight + (typeof props.maxHeight === "string" ? "" : "px"))
    const w = computed(() => props.width + (typeof props.width === "string" ? "" : "px"))
    const showCompact = computed(() => props.maxEntryLength > 0 && props.maxEntryLength <= 200)

    const anno = computed(() => props.data ? props.data : DM.getAnnotationById(props.id))
    const numEntries = computed(() => {
        if (typeof props.maxHeight === "string") {
            return anno.value.entries.length
        }
        return Math.round(props.maxHeight / 50)
    })
    const numHidden = computed(() => Math.max(0, anno.value.entries.length - numEntries.value))
    const entries = computed(() => {
        if (numHidden.value > 0) {
            return anno.value.entries.slice(0, numEntries.value)
        }
        return anno.value.entries
    })

</script>

<style scoped>
.anno-container:not(:hover) .extras {
    visibility: hidden;
}
</style>