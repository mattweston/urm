/**
 * # Weather RPC
 *
 * Demo/example domain: fetches current weather; fails with
 * `WeatherUnavailableError` when the upstream is unreachable.
 */
export { WeatherRpcLive } from "./handlers.ts"

export {
    WeatherData,
    WeatherGetCurrentRpc,
    WeatherRpcs,
    WeatherUnavailableError,
    type WeatherData as WeatherDataType,
    type WeatherUnavailableError as WeatherUnavailableErrorType,
} from "@urm/contracts/events/weather"
