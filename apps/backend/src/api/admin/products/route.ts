import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { syncProductWorkflow } from "../../../workflows/sync-product";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const { result } = await syncProductWorkflow(req.scope).run({
        input: req.body,
    });

    res.json({ product: result });
}