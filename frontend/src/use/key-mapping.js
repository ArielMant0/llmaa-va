export default class KeyMapping {

    constructor(index, key, label, command, modifiers=[], locked=false, color=null) {
        this.id = index
        this.key = key
        this.label = label
        this.command = command
        this.modifiers = modifiers
        this.locked = locked
        this.color = color
    }

    copy() {
        return new KeyMapping(
            this.index,
            this.key,
            this.label,
            this.command.copy(),
            this.modifiers.slice(),
            this.locked,
            this.color
        )
    }

    lock() {
        this.locked = true
    }

    unlock() {
        this.locked = false
    }

    matches(key, modifiers) {
        return (key === this.key || key.toLowerCase() === this.key) &&
            modifiers.length === this.modifiers.length &&
            modifiers.every(m => this.modifiers.includes(m)) &&
            this.modifiers.every(m => modifiers.includes(m))
    }

    isValidTarget(type) {
        return this.command.isValidTarget(type)
    }

    canTarget(numTargets=0) {
        return this.command.canTarget(numTargets)
    }

    execute(args) {
        this.command.execute(args)
    }
}