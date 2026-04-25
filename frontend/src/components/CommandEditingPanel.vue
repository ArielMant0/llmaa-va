<template>
    <v-card v-if="data.prompt" id="command-panel" density="compact" :style="{ maxWidth: maxW }">
        <v-card-text>
            <div class="text-caption" :class="{ 'text-red': numActiveTargets < data.cmd.minTargets}">
                <b>{{ numActiveTargets }}</b> / <b>{{ data.cmd.maxTargets }}</b> targets (min <b>{{ data.cmd.minTargets }}</b>)
            </div>
            <div class="d-flex">
                <template v-for="(target, i) in data.targets" :key="target.id">
                    <AnnotationEntity v-for="entity in target.entities"
                        :key="entity.id"
                        :entity="entity"
                        :class="{ 'ml-1': i > 0 }"
                        @remove="removeEntity(target, entity.id)"
                        />
                </template>
            </div>
            <v-divider class="mt-1 mb-1"></v-divider>
            <PromptPanel :prompt="data.prompt"/>
        </v-card-text>
        <v-card-actions>
            <v-btn color="warning" @click="cancel">cancel</v-btn>
            <v-btn color="success" @click="submit" :disabled="!minReached || maxReached">submit</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup>
    import { useControls } from '@/stores/controls';
    import { storeToRefs } from 'pinia';
    import PromptPanel from './PromptPanel.vue';
    import { computed, reactive, watch } from 'vue';
    import { LLMCommand } from '@/use/commands';
    import AnnotationEntity from './annotation/AnnotationEntity.vue';
    import CM from '@/use/command-manager';

    const controls = useControls()

    const { activeMappingId, numActiveTargets } = storeToRefs(controls)

    const props = defineProps({
        maxWidth: {
            type: [String, Number],
            default: "500px"
        }
    })
    const maxW = computed(() => props.maxWidth + (typeof props.maxWidth === "string" ? "" : "px"))

    const data = reactive({ prompt: null, cmd: null, targets: null })
    const minReached = computed(() => data.prompt ? numActiveTargets.value >= data.cmd.minTargets : true)
    const maxReached = computed(() => data.prompt ? numActiveTargets.value > data.cmd.maxTargets : true)

    function cancel() {
        controls.cancelActive()
    }

    function submit() {
        controls.executeActive()
    }

    function readTargets() {
        data.targets = CM.getTargets()
    }

    function removeEntity(target, entityId) {
        if (target.multiple) {
            target.removeEntity(entityId)
        } else {
            controls.removeTarget(target.id)
            readTargets()
        }
    }

    watch(numActiveTargets, readTargets)
    watch(activeMappingId, function(value) {
        if (value !== null) {
            const cmd = controls.activeMapping.command
            if (cmd instanceof LLMCommand) {
                data.cmd = cmd
                data.prompt = cmd.promptTemplate
                readTargets()
            } else {
                data.prompt = null
                data.cmd = null
                data.targets = null
            }
        } else {
            data.prompt = null
            data.cmd = null
            data.targets = null
        }
    })

</script>

<style scoped>
#command-panel {
    position: fixed;
    left: 15px;
    bottom: 10px;
    z-index: 5999;
}
</style>