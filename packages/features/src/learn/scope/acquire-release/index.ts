/** # Acquire Release
 *
 *  One of the runnable Effect examples. The lesson owns its route; the run
 *  engine that draws and executes it lives in `../effect-runner`, shared with
 *  the other examples because only one is ever on screen.
 */
export { is_acquire_release_path, acquire_release_href } from "./route.ts"

/** Which example the runner should select for this route. */
export const EXAMPLE_KEY = "AcquireRelease"
