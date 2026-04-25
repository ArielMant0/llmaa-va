<template>
    <v-dialog v-model="model" max-width="75%" min-height="50%" max-height="75%">
        <v-card class="pa-4 text-caption" density="compact">
            <v-card-title class="pa-2">
                <div style="position: relative;">
                    <span>Pick an attribute to change the plot's color</span>
                    <v-btn
                        style="position: absolute; top: 0x; right: -2px"
                        density="compact"
                        @click="close"
                        color="error"
                        icon="mdi-close"
                        variant="plain"/>
                </div>
            </v-card-title>

            <div class="mb-2">
                <v-text-field v-model="search"
                    placeholder="search attributes .."
                    density="compact"
                    hide-details
                    hide-spin-buttons
                    clearable
                    autofocus
                    variant="outlined"/>
            </div>

            <div class="d-flex flex-column flex-wrap" style="max-height: 65vh; overflow-y: auto;">
                <div v-for="c in filteredColumns"
                    class="text-dots hover-bg-grey cursor-pointer"
                    style="padding: 2px 5px; border-radius: 3px; min-width: 150px; max-width: 150px;"
                    @click="select(c)">
                    {{ c }}
                </div>
            </div>

        </v-card>
    </v-dialog>
</template>

<script setup>
    import { useData } from '@/stores/data'
    import DM from '@/use/data-manager'
    import { storeToRefs } from 'pinia'
    import { computed, onMounted, watch } from 'vue'

    const model = defineModel()

    const dstore = useData()
    const { datasetId } = storeToRefs(dstore)

    const emit = defineEmits(["select"])

    const search = ref("")

    const columns = ref([])
    const filteredColumns = computed(() => {
        if (search.value && search.value.length > 0) {
            return columns.value.filter(d => d.includes(search.value))
        }
        return columns.value
    })

    function select(column) {
        emit('select', column)
        close()
    }
    function close() {
        model.value = false
        search.value = ""
    }
    function read() {
        const array = DM.columns.slice()
        array.sort()
        columns.value = array
    }

    onMounted(read)

    watch(datasetId, read)
</script>