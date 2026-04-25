<template>
    <div class="hotbar" :style="{ transform: 'translate(-50%,'+offset+'px)', textAlign: 'center' }">
        <v-btn
            class="hide-btn mb-1"
            density="compact"
            variant="text"
            size="small"
            @click="showHotbar = !showHotbar"
            :icon="showHotbar ? 'mdi-chevron-double-down' : 'mdi-chevron-double-up'"/>

        <v-sheet class="pa-2 d-flex align-center justify-center" density="compact" elevation="4" rounded>
            <div v-for="(m, i) in mappings"
                :key="'km:'+m.id"
                :style="{
                    marginRight: i === 0 ? '4px' : '0',
                    marginLeft: i > 1 ? '4px' : '0',
                    minWidth: size+'px',
                    maxWidth: size+'px'
                }">
                <div class="keylabel text-dots" :style="{ minWidth: '100%', maxWidth: '100%', minHeight: '1em' }">
                    <input v-if="m && !m.locked" v-model="m.label" style="max-width: 100%; text-align: center;" :title="m.label">
                    <span v-else-if="m && m.locked" style="max-width: 100%; text-align: center;" :title="m.label">{{ m.label }}</span>
                    <span v-else style="max-width: 100%; text-align: center;"></span>
                </div>
                <v-btn
                    height="40"
                    variant="flat"
                    :color="m && m.color ? m.color : '#ddd'"
                    density="compact"
                    stacked
                    class="pa-0"
                    :class="{ aPulse: m && m.id === trigger }"
                    :style="{
                        textOverflow: 'clip',
                        minWidth: size+'px',
                        maxWidth: size+'px',
                        fontSize: size > 50 ? '14px' : '12px',
                        display: 'inline'
                    }"
                    @click="controls.triggerMapping(m)"
                    @contextmenu.prevent="record(i)">
                    <div v-if="m && m.key">
                        <div v-for="str in controls.formatArray(m.key, m.modifiers)">
                            {{ str }}
                        </div>
                    </div>
                </v-btn>
            </div>
        </v-sheet>

    </div>
</template>

<script setup>
    import { useApp } from '@/stores/app';
    import { useControls } from '@/stores/controls';
    import CM from '@/use/command-manager';
    import { useWindowSize } from '@vueuse/core';
    import { storeToRefs } from 'pinia';
    import { computed, onMounted, watch } from 'vue';
    import { toast } from 'vue3-toastify';

    const app = useApp()
    const controls = useControls()

    const { showHotbar } = storeToRefs(app)
    const { initialized, recording, recordMessage, trigger } = storeToRefs(controls)

    const { width } = useWindowSize()

    const size = computed(() => width.value <= 1600 ? 40 : 50)
    const offset = computed(() => -15 + (showHotbar.value ? 0 : 50))

    let toastId = null
    const mappings = ref([])

    function record(i) {
        controls.startRecordHotkey(i, 'group '+(i+1))
    }

    function readMappings() {
        mappings.value = CM.mappings.filter(d => d !== undefined)
    }

    onMounted(readMappings)

    watch(initialized, readMappings)

    watch(recording, function() {
        if (!recording.value && toastId !== null) {
            toast.remove(toastId)
            toastId = null
        }
    })

    watch(recordMessage, function(msg) {
        if (recording.value && msg.length > 0) {
            if (toastId !== null) {
                toast.update(toastId, { render: msg })
            } else {
                toastId = toast.loading(msg, { isLoading: true, position: toast.POSITION.TOP_CENTER })
            }
        }
    })

</script>

<style scoped>
.hotbar {
    z-index: 500;
    position: fixed;
    left: 50%;
    bottom: 0px;
    margin: 0 auto;
    transition: all 500ms linear;
}

.hotbar:not(:hover) .hide-btn {
    visibility: hidden;
}

.keylabel {
    text-align: center;
    font-size: 12px;
}
</style>