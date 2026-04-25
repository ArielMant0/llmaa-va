import { range } from "d3";

export function shuffle(array) {
    const a = array.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a
}

export function pick(array, size=1) {
    if (size > array.length) {
        throw new Error("pick size is greater than array size")
    }

    if (size === 1) {
        return array.at(Math.floor(Math.random()*size))
    }
    return shuffle(array).slice(size)
}