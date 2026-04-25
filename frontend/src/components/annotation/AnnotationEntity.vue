<template>
    <div
        class="d-flex align-center"
        @pointerenter="onEnter"
        @pointerleave="onLeave"
        >
        <v-chip
            closable
            :size="size"
            @click:close.prevent="emit('remove', entity)"
            @click="emit('click', entity)"
            :data-target-type="entity.targetType"
            :data-target-id="entity.id"
            :data-target-anno="annotation"
            density="compact">
            <v-icon v-if="!hideIcon" :icon="typeIcon" :size="size" class="mr-1 pt-1"></v-icon>
            {{ entity.name ? entity.name : entity.data }}
        </v-chip>
    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import { Entity, ENTITY_TYPE } from '@/use/annotation/entity';

    const props = defineProps({
        entity: {
            type: Entity,
            required: true
        },
        annotation: {
            type: String,
            default: ""
        },
        size: {
            type: String,
            default: "small"
        },
        hideIcon: {
            type: Boolean,
            default: false
        }
    })

    const emit = defineEmits(["click", "remove"])

    const app = useApp()

    const typeIcon = computed(() => {
        switch(props.entity.type) {
            case ENTITY_TYPE.ANNOTATION: return "mdi-note-edit-outline"
            case ENTITY_TYPE.DATAPOINT: return "mdi-circle"
            case ENTITY_TYPE.SELECTION: return "mdi-scatter-plot"
            case ENTITY_TYPE.COLUMN: return "mdi-pillar"
        }
    })

    function onEnter() {
        app.setHoverEntity(
            props.entity.id,
            {
                type: props.entity.targetType,
                data: props.entity.data
            }
        )
    }

    function onLeave() {
        app.unsetHoverEntity(props.entity.id)
    }

</script>