<template>
    <div class="d-flex align-center">
        <v-avatar :color="color" density="comfortable" size="24" class="mr-1" rounded="0">
            {{ label }}
        </v-avatar>
        <template v-if="size && size > 0">
            <div class="text-caption">
                {{ size }}<v-icon size="small">mdi-scatter-plot</v-icon>
            </div>
            <v-divider vertical class="ml-1 mr-1"></v-divider>
        </template>
        <input v-model="title" type="text" style="font-weight: bold;"/>
    </div>
</template>

<script setup>

    const title = defineModel("title", { type: String, required: true })
    const props = defineProps({
        "label": { type: String, required: true },
        "size": { type: Number, required: false },
        "color": { type: String, default: "primary" }
    })
</script>