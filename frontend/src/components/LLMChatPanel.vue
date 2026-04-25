<template>
    <v-card density="compact" style="width: 100%; max-width: 100%">
        <div
            ref="wrapper"
            class="mb-4 mt-4 pl-2 pr-2"
            :style="{ maxWidth: maxw, maxHeight: maxh }"
            style="min-height: 10px; overflow-y: auto;"
            :key="'up_'+chatTime"
            >
            <ChatEntryPanel v-for="entry in history"
                :key="entry.id"
                :entry="entry"
                class="ml-1 mr-1 mt-2 mb-2"
                />

            <div v-if="llmLoading" class=" mt-4 d-flex align-center justify-center">
                <v-progress-circular size="32" indeterminate></v-progress-circular>
            </div>
        </div>


        <ChatInput :disabled="llmLoading" class="ma-1" @submit="askModel"/>
    </v-card>
</template>

<script setup>
    import CHAT, { CHAT_ENTRY_TYPE } from '@/use/llm-chat';
    import { computed, onMounted, useTemplateRef } from 'vue';
    import ChatEntryPanel from './entrypanels/ChatEntryPanel.vue';
    import ChatInput from './ChatInput.vue';
    import { storeToRefs } from 'pinia';
    import { useApp } from '@/stores/app';
    import { llmFree } from '@/use/apis/llm-api';
    import { parseEntities } from '@/use/util';

    const app = useApp()
    const { llmLoading, chatTime } = storeToRefs(app)

    const props = defineProps({
        maxWidth: { type: [String, Number], default: "100%" },
        maxHeight: { type: [String, Number], default: "auto" },
    })

    const maxw = computed(() => props.maxWidth + (typeof props.maxWidth === "string" ? "" : "px"))
    const maxh = computed(() => props.maxHeight + (typeof props.maxHeight === "string" ? "" : "px"))

    const history = ref([])
    const wrapper = useTemplateRef("wrapper")

    function readChat() {
        history.value = CHAT.getHistory()
        scrollDown()
    }
    
    function scrollDown() {
        const rect = wrapper.value.getBoundingClientRect()
        wrapper.value.scrollTo({ yCoord: rect.bottom, behavior: "smooth" })
    }

    async function askModel(text) {
        try {
            scrollDown()
            llmLoading.value = true
            const response = await llmFree(text)
            console.log(response)
            const entities = parseEntities(response)

            llmLoading.value = false
            CHAT.addEntry(
                CHAT_ENTRY_TYPE.AI,
                response.answer,
                entities
            )
        } catch (e) {
            console.error(e)
        }
    }

    onMounted(readChat)

    watch(chatTime, readChat)
</script>