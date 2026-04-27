import { TargetData } from "./annotation/action-target"
import CM from "./command-manager"
import { LLMCommand } from "./commands"

export function useTargets() {

    const targetTime = ref(0)
    const targets = ref([])
    const showOverlay = ref(false)

    const activeMapping = ref(null)
    const activeMappingId = ref(null)
    
    const numActiveTargets = computed(() => targets.value.length)
    const hasActive = computed(() => activeMapping.value !== null)
    const canTarget = computed(() => hasActive.value &&
        activeMapping.value.canTarget(numActiveTargets.value)
    )

    function clear() {
        targets.value = []
        targetTime.value = Date.now()
    }

    function add(newTargets, targetType, annotation=null) {
        if (hasActive.value) {
            // only do sth if this is a valid target
            if (activeMapping.value.isValidTarget(targetType)) {
                if (activeMapping.value.canTarget(numActiveTargets.value)) {
                    const td = new TargetData(
                        Array.isArray(newTargets) ? newTargets : [newTargets],
                        targetType,
                        annotation
                    )

                    targets.value.push(td)
                    targetTime.value = Date.now()

                    // trigger immediately if we reached the maximum number of targets
                    if (!activeMapping.value.canTarget(numActiveTargets.value)) {
                        this.execute()
                    }
                } else {
                    execute()
                }
            }
        }
    }

    function remove(id) {
        if (hasActive.value) {
            const idx = targets.value.findIndex(d => d.id === id)
            if (idx >= 0) {
                targets.value.splice(idx, 1)
                targetTime.value = Date.now()
            }
        }
    }

    function canExecute() {
         if (hasActive.value) {
            const cmd = activeMapping.value.command
            if (cmd instanceof LLMCommand) {
                return numActiveTargets.value >= cmd.minTargets &&
                    numActiveTargets.value <= cmd.maxTargets
            }
            return true
        }
        return false
    }

    function execute() {
        if (canExecute()) {
            const targets = CM.getTargets()
            // execute callback with selected targets
            activeMapping.value.execute(targets.length > 1 ? targets : targets.at(0))
            clear()
            activeMapping.value = null
            activeMappingId.value = null
        }
    }

    function cancel() {
        if (hasActive.value) {
            clear()
            activeMapping.value = null
            activeMappingId.value = null
        }
    }

    
    return {
        targetTime,
        targets,
        activeMapping,
        activeMappingId,
        showOverlay,

        hasActive,
        numActiveTargets,
        canTarget,

        clear,
        add,
        remove,
        execute,
        canExecute,
        cancel,
    }
}