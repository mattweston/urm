/**
 * # Date Utils
 *
 * Date formatting utilities for URM.
 */

// Hand-rolled rather than Intl/toLocaleString: this runs in hot render paths
// where the Intl call dominated the frame. Output is the host's local timezone.
export const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}`
}
