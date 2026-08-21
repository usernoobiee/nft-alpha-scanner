import { toVercelHandler } from "@opensea/tool-sdk";
import { toolHandler } from "../src/handler.js";

export default toVercelHandler(toolHandler);
