<template>
    <div class="d-flex" :class="[side]">
        <v-sheet style="width: 90%;" rounded="sm" class="pa-1" :color="color">
            <div class="text-caption">
                <b>{{ author }}</b>, {{ entry.time.toLocaleString() }}
            </div>
            <p v-html="text" class="md"></p>
        </v-sheet>
    </div>
</template>

<script setup>
    import { CHAT_ENTRY_TYPE, ChatEntry } from '@/use/llm-chat';
    import { marked } from 'marked';
    import { computed } from 'vue';

    const props = defineProps({
        entry: {
            type: ChatEntry,
            required: true
        },
    })

    const side = computed(() => {
        return props.entry.type === CHAT_ENTRY_TYPE.AI ?
            "justify-start" :
            "justify-end"
    })

    const color = computed(() => {
        return props.entry.type === CHAT_ENTRY_TYPE.AI ?
            "surface-light" :
            "primary"
    })

    const text = computed(() => {
        return props.entry.type === CHAT_ENTRY_TYPE.AI ?
            marked.parse(props.entry.text) :
            props.entry.text
    })

    const author = computed(() => {
        return props.entry.type === CHAT_ENTRY_TYPE.AI ? "AI" : "You"
    })

</script>
