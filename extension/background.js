/**
 * Service-worker entry for the push-to-talk extension (issue #55).
 *
 * Thin on purpose: all logic lives in lib/background-core.js so it can be
 * unit-tested against a fake `chrome`. Registered as `type: "module"` in the
 * manifest, which is what allows this import.
 */
import { registerCommandHandler } from "./lib/background-core.js"

registerCommandHandler(chrome)
