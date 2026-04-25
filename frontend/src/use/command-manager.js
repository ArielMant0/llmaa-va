import KeyMapping from "./key-mapping"

const COLORS4 = ["#ef476f", "#06d6a0", "#118ab2", "#ffd166"]
const COLORS5_1 = ["#390099", "#f15bb5", "#ff0054", "#ff5400", "#ffbd00"]
const COLORS5_2 = ["#619b8a", "#a1c181", "#f0b51d", "#fe8435", "#233d4d"]


class CommandManager {

    constructor(sizeLocked=5, sizeUnlocked=8, colors=COLORS5_2) {
        this.sizeLocked = sizeLocked
        this.sizeUnlocked = sizeUnlocked
        this.colors = colors
        this.mappings = new Array(this.size)

        this.targets = []
    }

    get size() {
        return this.sizeLocked + this.sizeUnlocked
    }

    getColor(index) {
        return this.colors[(index-this.sizeLocked) % this.colors.length]
    }

    getKeyMapping(index) {
        return this.mappings[index]
    }

    getKeyMappingFromHotkey(key, modifiers=[], ignoreIndex=[]) {
        return this.mappings.find((d, i) => d !== undefined && !ignoreIndex.includes(i) && d.matches(key, modifiers))
    }

    setKeyMapping(index, mapping) {
        this.mappings[index] = mapping
    }

    addKeyMapping(index, key, label, command, modifiers=[]) {
        if (index < this.sizeLocked || index >= this.size) return
        this.mappings[index] = new KeyMapping(
            index,
            key,
            label,
            command,
            modifiers,
            false,
            this.getColor(index)
        )
    }

    addKeyMappingLocked(index, key, label, command, modifiers=[]) {
        if (index < 0 || index >= this.sizeLocked) return
        this.mappings[index] = new KeyMapping(
            index,
            key,
            label,
            command,
            modifiers,
            true,
            null
        )
    }

    get numTargets() {
        return this.targets.length
    }

    getTargets() {
        return this.targets
    }

    clearTargets() {
        this.targets = []
    }

    addTarget(target) {
        if (Array.isArray(target)) {
            if (target.length > 1) {
                this.targets = this.targets.concat(target)
            } else {
                this.targets.push(target[0])
            }
        } else {
            this.targets.push(target)
        }
    }

    removeTarget(id) {
        const idx = this.targets.findIndex(d => d.id === id)
        if (idx >= 0) {
            this.targets.splice(idx, 1)
        }
    }

}

const CM = new CommandManager()

export { CM as default }