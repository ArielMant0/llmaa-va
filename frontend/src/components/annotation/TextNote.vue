<template>
    <div class="d-flex">
        <v-textarea
            v-model="text"
            rows="1"
            class="mr-1"
            density="compact"
            hide-details
            hide-spin-buttons
            placeholder="make a note.."
            ></v-textarea>
        <v-btn
            icon="mdi-plus"
            :color="text.length > 0 ? 'success' : 'default'"
            variant="text"
            density="comfortable"
            rounded="sm"
            :disabled="text.length === 0"
            @click="saveAnnotation"
            ></v-btn>
    </div>
</template>

<script setup>
    import DM from '@/use/data-manager';
    import { ENTRY_SOURCE } from '@/use/annotation/annotation-entry';

    const text = defineModel("text", { type: String, default: "" })
    const props = defineProps({
        annotationId: { type: String, default: null },
        emitOnly: { type: Boolean, default: false }
    })

    const emit = defineEmits(["submit"])

    function saveAnnotation() {
        if (text.value.length > 0) {
            // default action if we should not just emit an event
            if (!props.emitOnly) {
                DM.annotateText(
                    text.value,
                    ENTRY_SOURCE.USER,
                    [],
                    { id: props.annotationId }
                )
            }
            emit("submit", text.value)
            text.value = ""
        }
    }
</script>