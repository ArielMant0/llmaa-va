import { polygonCentroid, polygonHull } from "d3"
import { euclidean } from "../util"

export function polygonSplit(points, polygon, minDistance=20) {
    if (points.length <= 3) return [points]

    const c = polygonCentroid(polygon)
    let minDist = Number.MAX_VALUE
    let point = null

    points.forEach(p => {
        const d = euclidean(p[0], p[1], c[0], c[1])
        if (d < minDist) {
            minDist = d;
            point = p
        }
    })

    if (point !== null && minDist >= minDistance) {
        const a = [], b = [];
        points.forEach(p => {
            const dC = euclidean(p[0], p[1], c[0], c[1])
            const dP = euclidean(p[0], p[1], point[0], point[1])
            if (dP < dC) {
                a.push(p)
            } else {
                b.push(p)
            }
        })

        let tmp = []
        if (a.length > 0 && b.length > 0) {
            tmp = polygonSplit(a, polygonHull(a)).concat(polygonSplit(b, polygonHull(b)))
        } else if (b.length > 0) {
            tmp = polygonSplit(b, polygonHull(b))
        } else if (a.length > 0) {
            tmp = polygonSplit(a, polygonHull(a))
        }

        return tmp.filter(d => d.length > 0)
    }

    return [polygon]
}

export function polygonEnlarge(polygon, centroid) {
    if (polygon.length < 3) return polygon
    return polygon.map(([px, py]) => {
        const vx = px - centroid[0]
        const vy = py - centroid[1]
        const norm = Math.sqrt(vx*vx + vy*vy)
        return [px + vx / norm * 5, py + vy / norm * 5]
    })
}

export function makePolygon(points) {
    let polygon;
    if (points.length > 3) {
        polygon = polygonSplit(points, polygonHull(points))
    } else {
        polygon = [points]
    }

    const centroid = polygon.map(p => makeCentroid(p))

    for (let i = 0; i < polygon.length; ++i) {
        polygon[i] = polygonEnlarge(polygon[i], centroid[i])
    }

    return { polygon, centroid }
}

export function makeCentroid(polygon) {
    if (polygon.length === 1) {
        return polygon[0]
    } else if (polygon.length === 2) {
        return [
            polygon[0][0]*0.5 + polygon[1][0]*0.5,
            polygon[0][1]*0.5 + polygon[1][1]*0.5,
        ]
    } else {
        return polygonCentroid(polygon)
    }
}
