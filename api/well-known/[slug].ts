import { createWellKnownHandler } from "@opensea/tool-sdk";
import { manifest } from "../../src/manifest.js";

export default createWellKnownHandler(manifest);
