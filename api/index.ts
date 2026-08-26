import { toVercelHandler } from "@opensea/tool-sdk";
import { toolHandler } from "../src/handler.js";

// The OpenSea Tool SDK already provides the Vercel adapter.
// Using it preserves the SDK's Web Request/Response semantics and
// handles POST-only validation, schema errors, and tool responses correctly.
export default toVercelHandler(toolHandler);
