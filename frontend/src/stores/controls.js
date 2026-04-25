import { TargetData } from '@/use/annotation/action-target'
import CM from '@/use/command-manager'
import { LLMCommand } from '@/use/commands'
import { capitalize } from '@/use/util'
import { defineStore } from 'pinia'

function isValidKey(key) {
    return new RegExp(/\w/, "i").test(key)
}
function isInputElement(tagName) {
    return tagName === "INPUT" || tagName === "TEXTAREA"
}

export const useControls = defineStore('controls', {
    state: () => ({
        activeMapping: null,
        activeMappingId: null,
        numActiveTargets: 0,

        initialized: false,

        recording: false,
        recordMessage: "",
        recordTarget: null,
        recordLabel: null,
        trigger: null
    }),

    getters: {
        hasActive: state => state.activeMapping !== null,
        canTarget: state => state.activeMapping !== null && state.activeMapping.command.canTarget(state.numActiveTargets)
    },

    actions: {

        setInitialized() {
            this.initialized = true
        },

        format(key, modifiers=[]) {
            let str = modifiers.reduce((acc, m) => acc + capitalize(m)+"+", "")
            if (key.startsWith("Arrow")) {
                str += key.slice(5)
            } else  {
                str += key
            }
            return str
        },

        formatArray(key, modifiers=[]) {
            const array = modifiers.map(m => capitalize(m)+"+")
            if (key.startsWith("Arrow")) {
                array.push(capitalize(key.slice(5)))
            } else  {
                array.push(capitalize(key))
            }
            return array
        },

        triggerMapping(mapping) {
            // reset targets if we click a different key while another is still active
            if (this.activeMapping !== null && mapping.id !== this.activeMappingId) {
                this.cancelActive()
            }
            // set this to the active mapping
            this.activeMapping = mapping
            this.activeMappingId = mapping.id

            // indicate which button triggered the action
            this.trigger = mapping.id
            setTimeout(() => this.trigger = null, 500)

            // if no targets are allowed, execute immediately
            if (!mapping.canTarget()) {
                this.executeActive()
            }
        },

        keyEvent(event) {
            if (document.activeElement && isInputElement(document.activeElement.tagName)) return
            // if we have an active hotkey/mapping and clicked ESC, cancel the action
            if (this.hasActive) {
                if (event.key === "Escape") {
                    return this.cancelActive()
                }
                if (event.key === "Enter") {
                    return this.executeActive()
                }
            }


            if (!isValidKey(event.key)) return

            if (this.recording) {
                return this.recordHotkey(event)
            }

            const mods = [
                event.ctrlKey ? "ctrl" : null,
                event.shiftKey ? "shift" : null,
                event.metaKey ? "meta" : null,
            ].filter(d => d !== null)

            const m = CM.getKeyMappingFromHotkey(event.key, mods)

            if (m) {
                event.preventDefault()
                this.triggerMapping(m)
            }
        },

        targetEvent(targets, targetType, annotation=null) {
            if (this.hasActive) {
                // only do sth if this is a valid target
                if (this.activeMapping.isValidTarget(targetType)) {
                    if (this.activeMapping.canTarget(this.numActiveTargets)) {
                        CM.addTarget(new TargetData(
                            Array.isArray(targets) ? targets : [targets],
                            targetType,
                            annotation
                        ))
                        this.numActiveTargets = CM.numTargets
                        // trigger immediately if we reached the maximum number of targets
                        if (!this.activeMapping.canTarget(this.numActiveTargets)) {
                            this.executeActive()
                        }
                    } else {
                        this.executeActive()
                    }
                }
            }
        },

        removeTarget(id) {
            if (this.hasActive) {
                CM.removeTarget(id)
                this.numActiveTargets = CM.numTargets
            }
        },

        canExecuteActive() {
            if (this.hasActive) {
                const cmd = this.activeMapping.command
                if (cmd instanceof LLMCommand) {
                    return this.numActiveTargets >= cmd.minTargets &&
                        this.numActiveTargets <= cmd.maxTargets
                }
                return true
            }
            return false
        },

        executeActive() {
            if (this.canExecuteActive()) {
                const targets = CM.getTargets()
                // execute callback with selected targets
                this.activeMapping.execute(targets.length > 1 ? targets : targets.at(0))
                CM.clearTargets()
                this.numActiveTargets = 0
                this.activeMapping = null
                this.activeMappingId = null
            }
        },

        cancelActive() {
            if (this.hasActive) {
                CM.clearTargets()
                this.numActiveTargets = 0
                this.activeMapping = null
                this.activeMappingId = null
            }
        },

        recordHotkey(event) {
            if (this.recordTarget !== null) {
                const key = event.key
                // cancel if user presses escape
                if (key === "Escape") {
                    this.recording = false
                    this.recordMessage = ""
                    this.recordTarget = null
                    this.recordLabel = null
                    return
                }
                // cancel if not a valid key (like only shift or control)
                if (key.length > 1 || !isValidKey(key) || !CM.getKeyMapping(this.recordTarget)) return

                const m = CM.getKeyMapping(this.recordTarget).copy()

                m.key = key
                m.modifiers = []
                if (event.ctrlKey) {
                    m.modifiers.push("ctrl")
                }
                if (event.shiftKey) {
                    m.modifiers.push("shift")
                }
                if (event.metaKey) {
                    m.modifiers.push("meta")
                }

                const existing = CM.getKeyMappingFromHotkey(key, m.modifiers, [this.recordTarget])
                if (existing) {
                    if (existing.locked) {
                        this.recordMessage = "locked hotkey already assigned"
                        return
                    }
                    existing.key = null
                }

                CM.setKeyMapping(this.recordTarget, m)

                this.recording = false
                this.recordMessage = ""
                this.recordTarget = null
                this.recordLabel = null
            }
        },

        startRecordHotkey(index, label) {
            // ignore locked hotkeys
            if (index < CM.sizeLocked) return;
            this.recordTarget = index
            this.recordLabel = label
            this.recordMessage = "press your desired hotkey now"
            this.recording = true
        }
    }
})
