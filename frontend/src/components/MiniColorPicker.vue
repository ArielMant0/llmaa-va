<template>
    <input v-model="model"
        type="color"
        :style="{ width: wh, height: wh }"/>
</template>

<script setup>
import { computed } from 'vue';

    const model = defineModel({ type: String, default: "#000000" })
    const props = defineProps({
        size: {
            type: [Number, String],
            default: "auto"
        }
    })

    const wh = computed(() => props.size + (typeof props.size === "string" ? "" : "px"))
</script>