import { useApp } from "@/stores/app"

let _CHAT_EID = 1

const CHAT_ENTRY_TYPE = Object.freeze({
    AI: 1,
    USER: 2
})

class ChatEntry {

    constructor(type, text, entities=[]) {
        this.id = `${_CHAT_EID++}_chatent`
        this.type = type
        this.text = text
        this.entities = entities
        this.time = new Date()
    }
}

class LLMChat {

    constructor() {
        this.history = []
        this.timeUpdated = 0
    }

    get empty() {
        return this.history.length === 0
    }

    update() {
        this.timeUpdated = Date.now()
        const app = useApp()
        app.updateChat()
    }

    getHistory() {
        return this.history
    }

    hasEntry(id) {
        return this.getEntry(id) !== undefined
    }

    getEntry(id) {
        if (!id) {
            return this.empty ? undefined : this.history.at(-1)
        }
        return this.history.find(d => d.id === id)
    }

    addEntry(type, text, entities=[]) {
        this.history.push(new ChatEntry(type, text, entities))
        this.update()
    }

    removeEntry(id) {
        const idx = this.history.findIndex(id)
        if (idx >= 0) {
            this.history.splice(idx, 1)
            this.update()
        }
    }

    popEntry() {
        if (!this.empty) {
            this.history.pop()
            this.update()
        }
    }
}

const CHAT = new LLMChat()

export { CHAT as default, ChatEntry, CHAT_ENTRY_TYPE }