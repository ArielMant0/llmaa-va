export class PromptVariable {

    constructor(name, value, type="string") {
        this.name = name
        this.value = value
        this.defaultValue = value
        this.type = type
        this.lastUpdate = Date.now()
    }

    copy() {
        const pv = new PromptVariable(this.name, this.value, this.type)
        pv.defaultValue = this.defaultValue
        return pv
    }

    reset() {
        this.value = this.defaultValue
    }

    parseValue(value) {
        switch(this.type) {
            default:
            case "string":
                return value
            case "integer":
                return typeof value === "number" ? Math.round(value) : Number.parseInt(value)
            case "float":
                return typeof value === "number" ? value : Number.parseFloat(value)
        }
    }

    setValue(value) {
        const newValue = this.parseValue(value)
        if (this.isValid(newValue)) {
            this.value = newValue
            this.lastUpdate = Date.now()
        }
    }

    isValid(value) {
        switch(this.type) {
            default:
            case "string":
                return true
            case "integer":
                return Number.isInteger(this.parseValue(value))
            case "float":
                return !Number.isNaN(this.parseValue(value))
        }
    }
}

export class PromptTemplate {

    constructor(text, variables=[]) {
        this.text = text
        this.variables = variables
    }

    copy() {
        return new PromptTemplate(this.text, this.variables.map(d => d.copy()))
    }

    getVariable(name) {
        return this.variables.find(d => d.name === name)
    }

    setVariable(name, value) {
        const v = this.getVariable(name)
        if (v) {
            v.setValue(value)
            return v.value
        }
    }

    substitute() {
        let prompt = this.text
        // replace variables with given values
        this.variables.forEach(d => prompt = prompt.replace(`:${d.name}:`, d.value))
        return prompt
    }
}