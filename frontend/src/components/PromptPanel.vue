
<template>
    <p>
        <template v-for="(part, index) in parts" :key="index">
            <span v-if="!part.keyword">
                {{ part.value }}
            </span>

            <input v-else-if="part.type === 'string'"
                v-model="part.value"
                type="text"
                class="pa-1 keyword"
                style="max-width: 200px; width: fit-content;"
                @change="setValue(part)"
                />

            <input v-else
                v-model="part.value"
                type="number"
                :step="part.type === 'integer' ? 1 : undefined"
                class="pa-1 keyword"
                style="max-width: 50px;"
                @change="setValue(part)"
                />
        </template>
    </p>
</template>

<script setup>
    import { onMounted, watch } from 'vue'
    import { PromptTemplate } from '@/use/prompt-template'

    const props = defineProps({
        prompt: {
            type: PromptTemplate,
            required: true,
        },
    })

    const emit = defineEmits(['update'])

    const parts = ref([])

    /**
     * Parse prompt into parts that can be edited if they are keywords.
     */
    function parse() {
        const regex = /:([a-zA-Z0-9_]+):/g
        const result = []
        let lastIndex = 0
        let match
        let matchedKeywords = new Map()

        const template = props.prompt.text

        while ((match = regex.exec(template)) !== null) {
            if (match.index > lastIndex) {
                result.push({
                    keyword: false,
                    value: template.slice(lastIndex, match.index)
                })
            }

            const v = props.prompt.getVariable(match[1])
            if (matchedKeywords.has(match[1])) {
                const index = matchedKeywords.get(match[1])
                result.push(result[index])
            } else {
                result.push({
                    keyword: true,
                    name: match[1],
                    type: v.type,
                    value: v.value
                })
            }

            lastIndex = regex.lastIndex
        }

        if (lastIndex < template.length) {
            result.push({
                type: 'text',
                value: template.slice(lastIndex)
            })
        }

        parts.value = result
    }

    function setValue(part) {
        props.prompt.setVariable(part.name, part.value)
        emit("update")
    }

    onMounted(parse)

    watch(() => props.prompt.text, parse)
</script>

<style scoped>
.keyword {
    display: inline;
    border-radius: 4px;
    border: thin solid lightgray;
}
</style>
