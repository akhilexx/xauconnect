/**
 * @xauconnect/ui/three — Three.js / R3F scenes.
 * Kept on a separate subpath so consumers that don't need WebGL never pull
 * three into their bundle. Always import with next/dynamic({ ssr: false }).
 */
export { FlowFieldScene, type FlowFieldSceneProps } from "./flow-field.js";
