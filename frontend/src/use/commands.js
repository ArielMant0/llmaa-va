
export class Command {

    constructor(callback) {
        this.callback = callback
    }

    copy() {
        return new Command(this.callback)
    }

    execute(args) {
        this.callback(args)
    }

    isValidTarget() {
        return true
    }

    canTarget() {
        return false
    }
}

export class LLMCommand extends Command {

    constructor(callback, promptTemplate, minTargets=0, maxTargets=0, targetTypes=[]) {
        super(callback)
        this.promptTemplate = promptTemplate
        this.minTargets = minTargets
        this.maxTargets = maxTargets
        this.targetTypes = targetTypes
    }

    copy() {
        return new LLMCommand(
            this.callback,
            this.promptTemplate.copy(),
            this.minTargets,
            this.maxTargets,
            this.targetTypes.slice()
        )
    }

    execute(args) {
        this.callback(this.promptTemplate.substitute(), args)
    }

    isValidTarget(type) {
        if (this.targetTypes.length === 0 || this.minTargets === 0) return true
        return this.targetTypes.includes(type)
    }

    canTarget(numTargets) {
        return this.minTargets > 0 && this.maxTargets > numTargets
    }
}