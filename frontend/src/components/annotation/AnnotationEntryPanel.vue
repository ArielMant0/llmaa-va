<template>
    <v-sheet
        :style="{ maxWidth: maxw }"
        rounded
        class="mb-1 pa-1 text-caption"
        :data-target-type="ACTION_TARGET.ANNOTATION"
        :data-target-id="data.id"
        :data-target-anno="data._anno.id"
        :data-target-selections="data._anno.getSelectionIds().join(',')"
        >

        <div class="d-flex justify-space-between">
            <div>
                <v-icon size="small" :icon="sourceIcon"/>
                <v-icon size="small" class="ml-1" :icon="typeIcon"/>
            </div>
            <v-btn
                icon="mdi-close"
                density="compact"
                variant="plain"
                color="error"
                size="small"
                @click="data._anno.removeEntry(data.id)"
                />
        </div>

        <template v-if="data.text">
            <textarea v-if="showMarkdown"
                v-model="data.text"
                ref="editArea"
                style="width: 100%; border: thin solid lightgray; border-radius: 4px;"
                :rows="textRows"
                class="text-wrap pl-1 pr-1 md"
                @blur="setShowMarkdown(false)"
                @keyup="onTextKeyUp"
                @change="data.update()"
                >
                {{ data.text }}
            </textarea>
            <div v-else v-html="markdown"
                class="md"
                style="width: 95%; height: fit-content;"
                @click="setShowMarkdown(true)"
                >
            </div>
        </template>


        <div class="mt-1">
            <EntitiesPanel v-if="data.type === ENTRY_TYPE.TEXT"
                :entities="data.entities"
                :annotation="data._anno.id"
                @remove="id => data.removeEntity(id)"
                />
            <ModifierPanel v-else-if="data.type === ENTRY_TYPE.MODIFIER"
                :modifier="data.modifier"
                :compact="compact"
                :annotation="data._anno.id"
                @update="data.update()"
                />
        </div>
    </v-sheet>
</template>

<script setup>
    import { marked } from 'marked';
    import { ACTION_TARGET } from '@/use/annotation/action-target';
    import { ENTRY_SOURCE, ENTRY_TYPE, ModifierEntry, TextEntry } from '@/use/annotation/annotation-entry';
    import { computed, onMounted, useTemplateRef, watch } from 'vue';
    import EntitiesPanel from '../entrypanels/EntitiesPanel.vue';
    import ModifierPanel from '../entrypanels/ModifierPanel.vue';

    const props = defineProps({
        data: {
            type: [TextEntry, ModifierEntry],
            required: true
        },
        compact: {
            type: Boolean,
            default: false
        },
        maxWidth: {
            type: [Number, String],
            default: "auto"
        },
        maxLength: {
            type: Number,
            default: 0
        }
    })

    const editArea = useTemplateRef("editArea")

    const maxw = computed(() => typeof props.maxWidth === "number" ? props.maxWidth+'px' : props.maxWidth)
    const sourceIcon = computed(() => props.data.source === ENTRY_SOURCE.AI ? "mdi-robot-happy" : "mdi-account")
    const typeIcon = computed(() => {
        switch(props.data.type) {
            default:
            case ENTRY_TYPE.TEXT: return "mdi-format-text"
            case ENTRY_TYPE.VIS: return "mdi-chart-bar"
        }
    })

    const showMarkdown = ref(false)
    const markdown = ref("")
    const textRows = ref(1)

    function convertMarkdown() {
        const truncate = props.maxLength > 0 && props.data.text.length > props.maxLength
        markdown.value = marked.parse(truncate ?
            props.data.text.slice(0, props.maxLength)+"..." :
            props.data.text
        )
    }

    function setShowMarkdown(value) {
        showMarkdown.value = value
    }

    function onTextKeyUp(event) {
        // on enter, add another row to the text area (up to a maximum of 10)
        if (event.key === "Enter" && textRows.value < 10) {
            textRows.value += 1
        }
    }

    onMounted(function() {
        convertMarkdown()
        if (props.data.text) {
            textRows.value = Math.floor(props.data.text.length / 65)
        }
    })

    watch(editArea, function() {
        if (editArea.value) {
            editArea.value.focus()
        }
    })

    watch(() => props.data.timeUpdated, convertMarkdown)
</script>
