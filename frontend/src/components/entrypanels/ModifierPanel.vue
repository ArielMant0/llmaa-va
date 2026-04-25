<template>
    <div>
        <div v-if="modifier.type === MODIFIER_TYPE.COLOR_FUNCTION" :class="{ 'd-flex': compact, 'flex-wrap': compact }">
            <div v-for="col in modifier.entities" :key="col.name" class="d-flex align-center">
                <div class="d-flex align-center" style="width: 100px; max-width: 100px;">
                    <AnnotationEntity
                        :class="{ 'mb-1': compact, 'mr-1': compact }"
                        :entity="col"
                        :annotation="annotation"
                        @remove="removeEntity(col.id)"
                        hide-icon
                        />
                    <span style="font-size: smaller;" class="ml-1">({{ col.value.toFixed(1) }})</span>
                </div>
                <v-slider v-if="!compact"
                    v-model="col.value"
                    :min="-1"
                    :max="1"
                    class="text-caption"
                    @update:model-value="onChange"
                    hide-details
                    hide-spin-buttons
                    density="compact"
                    />
            </div>
        </div>
    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import DM from '@/use/data-manager';
    import { Modifier, MODIFIER_TYPE } from '@/use/annotation/modifiers';
    import AnnotationEntity from '../annotation/AnnotationEntity.vue';

    const props = defineProps({
        modifier: { type: Modifier, required: true },
        compact: { type: Boolean, default: false },
        annotation: { type: String, default: null },
    })

    const emit = defineEmits(["update", "remove"])

    const app = useApp()

    let rafPending = false, rafTime = 0

    function onChange() {
        if (!rafPending) {
            rafPending = true
        }
        rafTime = Date.now()
        requestAnimationFrame(check)
    }

    function check() {
        if (rafPending && Date.now() - rafTime > 150) {
            rafPending = false
            rafTime = 0
            refreshColor()
        } else {
            requestAnimationFrame(check)
        }
    }

    function refreshColor() {
        props.modifier.applyAll(DM.getData(false))
        app.scales[MODIFIER_TYPE.COLOR_FUNCTION] = props.modifier.colormap
        DM.columnUpdate(props.modifier.type, 10, function() {
            const now = Date.now()
            app.featureTime = now
            app.lensTime = now
            emit("update")
        })
    }

    function removeEntity(entityId) {
        props.modifier.removeEntity(entityId)
        refreshColor()
    }

</script>