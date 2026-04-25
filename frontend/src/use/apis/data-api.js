import { useLoader } from "../loader";

const DATA_API_PREFIX = "data"

/**
 * Get data from the backend
 * @param {Number} dataset dataset id 
 * @returns
 */
export async function getData(type, dataset=null) {
    const loader = useLoader()
    return dataset !== null ? 
        loader.get(`/${DATA_API_PREFIX}/${dataset}/${type}`) :
        loader.get(`/${DATA_API_PREFIX}/${type}`)
}

/**
 * Create some new data
 * @param {Any} data 
 * @returns
 */
export async function createData(type, data) {
    const loader = useLoader()
    return loader.post(`/${DATA_API_PREFIX}/create/${type}`, data)
}

/**
 * Update existing data
 * @param {Any} data 
 * @returns
 */
export async function updateData(type, data) {
    const loader = useLoader()
    return loader.post(`/${DATA_API_PREFIX}/update/${type}`, data)
}

/**
 * Delte existing data
 * @param {Any} data 
 * @returns
 */
export async function deleteData(type, data) {
    const loader = useLoader()
    return loader.post(`/${DATA_API_PREFIX}/delete/${type}`, data)
}
