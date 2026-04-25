<template>
    <div class="d-flex flex-wrap">
        <AnnotationEntity v-for="ent in entities"
            :key="ent.id"
            :entity="ent"
            :annotation="annotation"
            @remove="emit('remove', ent.id)"
            class="mr-1 mb-1"
            />
    </div>
</template>

<script setup>
    import AnnotationEntity from '../annotation/AnnotationEntity.vue';

    const props = defineProps({
        entities: { type: Array, default: () => ([]) },
        annotation: { type: String, default: null },
    })

    const emit = defineEmits(["remove"])
</script>