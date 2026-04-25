<template>
    <div class="d-flex align-center">
        <v-text-field
            v-model="text"
            class="mr-1"
            density="compact"
            hide-details
            hide-spin-buttons
            :disabled="disabled"
            placeholder="ask the model.."
            @keyup="onKeyUp"
            />
        <v-btn
            icon="mdi-send"
            :color="text.length > 0 ? 'success' : 'default'"
            variant="text"
            density="comfortable"
            rounded="sm"
            :disabled="disabled || text.length === 0"
            @click="makePrompt"
            ></v-btn>
    </div>
</template>

<script setup>
    import CHAT, { CHAT_ENTRY_TYPE } from '@/use/llm-chat';

    const text = defineModel("text", { type: String, default: "" })
    const props = defineProps({
        emitOnly: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
    })

    const emit = defineEmits(["submit"])

    function makePrompt() {
        if (text.value.length > 0) {
            // default action if we should not just emit an event
            if (!props.emitOnly) {
                CHAT.addEntry(CHAT_ENTRY_TYPE.USER, text.value)
            }
            emit("submit", text.value)
            text.value = ""
        }
    }

    function onKeyUp(event) {
        if (event.key === "Enter") {
            makePrompt()
        }
    }
</script>